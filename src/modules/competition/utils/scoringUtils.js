/**
 * Utility to display scoring information in competition mode
 * Uses the Linear-Exponential Decay (L-ED) formula
 */

const scoringDefaults = {
  minScoreRatio: 0.3,
  minScoreFloor: 10,
  solverDecayConstant: 0.12,
  attemptPenaltyConstant: 0.35,
  timeOriginMinutes: 0,
  timeOffsetMinutes: 0,
  timeDecay: 0,
  fallbackTimeScaleMinutes: 180,
  solverWeight: 0.7,
  timeWeight: 0.3,
};

const EPSILON = 0.000001;

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeWeights = (solverWeight, timeWeight) => {
  const safeSolverWeight = Math.max(toFiniteNumber(solverWeight, 0), 0);
  const safeTimeWeight = Math.max(toFiniteNumber(timeWeight, 0), 0);
  const totalWeight = safeSolverWeight + safeTimeWeight;

  if (totalWeight <= 0) {
    return {
      solverWeight: scoringDefaults.solverWeight,
      timeWeight: scoringDefaults.timeWeight,
    };
  }

  return {
    solverWeight: safeSolverWeight / totalWeight,
    timeWeight: safeTimeWeight / totalWeight,
  };
};

const resolveMinScore = (maxScore, explicitMinScore = null) => {
  if (explicitMinScore !== null && explicitMinScore !== undefined) {
    return clamp(Math.round(toFiniteNumber(explicitMinScore, 0)), 0, maxScore);
  }

  const derivedMinScore = Math.max(
    Math.round(maxScore * scoringDefaults.minScoreRatio),
    Math.round(scoringDefaults.minScoreFloor)
  );

  return clamp(derivedMinScore, 0, maxScore);
};

const resolveTimeScaleMinutes = (competitionDurationMinutes) => {
  const normalizedCompetitionDuration = toFiniteNumber(competitionDurationMinutes, 0);

  if (normalizedCompetitionDuration > 0) {
    return normalizedCompetitionDuration;
  }

  return Math.max(toFiniteNumber(scoringDefaults.fallbackTimeScaleMinutes, 180), 1);
};

const getCompetitionDurationMinutes = (competitionStartDate, competitionEndDate) => {
  if (!competitionStartDate || !competitionEndDate) {
    return null;
  }

  const startTime = new Date(competitionStartDate).getTime();
  const endTime = new Date(competitionEndDate).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return null;
  }

  return (endTime - startTime) / 60000;
};

const getElapsedMinutes = (competitionStartDate, now = new Date()) => {
  if (!competitionStartDate) {
    return 0;
  }

  const startTime = new Date(competitionStartDate).getTime();
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(currentTime)) {
    return 0;
  }

  return Math.max((currentTime - startTime) / 60000, 0);
};

const hasDatabaseScoringSettings = (competitionStartDate, competitionEndDate, scoringSettings) => {
  const requiredSettingKeys = [
    "solverWeight",
    "timeWeight",
    "solverDecayConstant",
    "attemptPenaltyConstant",
    "minScoreFloor",
  ];

  if (!competitionStartDate || !competitionEndDate || !scoringSettings) {
    return false;
  }

  return requiredSettingKeys.every(key => (
    scoringSettings[key] !== null
    && scoringSettings[key] !== undefined
    && `${scoringSettings[key]}`.trim() !== ""
  ));
};

export const calculateProjectedCompetitionScore = ({
  maxScore,
  solverCount = 0,
  attempts = 1,
  competitionStartDate = null,
  competitionEndDate = null,
  scoringSettings = null,
  now = new Date(),
} = {}) => {
  const safeMaxScore = Math.max(Math.round(toFiniteNumber(maxScore, 0)), 0);

  if (safeMaxScore <= 0) {
    return {
      exactScore: 0,
      roundedScore: 0,
      minScore: 0,
      solveTimeMinutes: 0,
      solveCount: 1,
    };
  }

  if (!hasDatabaseScoringSettings(competitionStartDate, competitionEndDate, scoringSettings)) {
    return null;
  }

  const safeMinScore = resolveMinScore(
    safeMaxScore,
    scoringSettings?.minScoreFloor ?? null
  );
  const safeSolveCount = Math.max(Math.round(toFiniteNumber(solverCount, 0)), 0) + 1;
  const safeAttempts = Math.max(Math.round(toFiniteNumber(attempts, 1)), 1);
  const solveTimeMinutes = getElapsedMinutes(competitionStartDate, now);
  const competitionDurationMinutes = getCompetitionDurationMinutes(
    competitionStartDate,
    competitionEndDate
  );
  const safeOriginMinutes = Math.max(
    toFiniteNumber(scoringSettings?.timeOriginMinutes, scoringDefaults.timeOriginMinutes),
    0
  );
  const safeOffsetMinutes = Math.max(
    toFiniteNumber(scoringSettings?.timeOffsetMinutes, scoringDefaults.timeOffsetMinutes),
    0
  );
  const safeTimeDecay = clamp(
    toFiniteNumber(scoringSettings?.timeDecay, scoringDefaults.timeDecay),
    0,
    0.9999
  );
  const safeScaleMinutes = resolveTimeScaleMinutes(competitionDurationMinutes);
  const safeSolverDecayConstant = Math.max(
    toFiniteNumber(scoringSettings?.solverDecayConstant, scoringDefaults.solverDecayConstant),
    0
  );
  const safeAttemptPenaltyConstant = Math.max(
    toFiniteNumber(scoringSettings?.attemptPenaltyConstant, scoringDefaults.attemptPenaltyConstant),
    0
  );
  const normalizedWeights = normalizeWeights(
    scoringSettings?.solverWeight ?? scoringDefaults.solverWeight,
    scoringSettings?.timeWeight ?? scoringDefaults.timeWeight
  );
  const scalingFactor = safeScaleMinutes / Math.max(1 - safeTimeDecay, EPSILON);
  const timeDelta = Math.max(0, Math.abs(solveTimeMinutes - safeOriginMinutes) - safeOffsetMinutes);
  const solverComponent = safeMinScore
    + ((safeMaxScore - safeMinScore) * Math.exp(-safeSolverDecayConstant * safeSolveCount));
  const timeComponent = Math.max((scalingFactor - timeDelta) / scalingFactor, 0);
  const attemptPenalty = Math.exp(-safeAttemptPenaltyConstant * (safeAttempts - 1));
  const exactScore = Math.max(
    (
      (normalizedWeights.solverWeight * solverComponent)
      + (normalizedWeights.timeWeight * safeMaxScore * timeComponent)
    ) * attemptPenalty,
    safeMinScore
  );

  return {
    exactScore,
    roundedScore: Math.round(exactScore),
    minScore: safeMinScore,
    solveTimeMinutes,
    solveCount: safeSolveCount,
  };
};

const formatLiveScore = score => `${Math.max(score, 0).toFixed(1)} pts now`;

export const getScoringInfo = () => {
  return {
    model: "Linear-Exponential Decay (L-ED)",
    description: "Points are awarded dynamically based on solver count, time, and attempts",
    factors: [
      "Solver Count: Early solvers earn more points",
      "Time Elapsed: Faster solutions earn more points",
      "Team Attempts: Fewer team attempts earn more points",
    ],
  };
};

/**
 * Format points display for competition challenges
 * Shows a live score estimate that decreases over time
 */
export const formatCompetitionPoints = (
  basePoints,
  {
    solverCount = 0,
    attempts = 1,
    isSolved = false,
    competitionStartDate = null,
    competitionEndDate = null,
    scoringSettings = null,
    now = new Date(),
  } = {}
) => {
  const projectedScore = calculateProjectedCompetitionScore({
    maxScore: basePoints,
    solverCount,
    attempts,
    competitionStartDate,
    competitionEndDate,
    scoringSettings,
    now,
  });

  return {
    basePoints,
    displayText: isSolved || !projectedScore
      ? `Max ${basePoints} pts`
      : formatLiveScore(projectedScore.exactScore),
    helperText: isSolved
      ? "Final score was locked in when your team solved it"
      : projectedScore
        ? `Max ${basePoints} pts on a first-attempt solve`
        : "Decay formula will use the competition database settings",
    tooltipText:
      projectedScore
        ? "Competition scoring is dynamic. The live estimate decreases as more teams solve the challenge and as more competition time passes. Additional attempts will reduce your actual awarded score further."
        : "Competition scoring uses the database-backed competition settings. The live decay estimate appears after those settings are loaded.",
    projectedScore,
    hasDecayFormula: !isSolved,
    isDecayBased: true,
  };
};

/**
 * Get scoring explanation for modal
 */
export const getScoringExplanation = () => {
  return `Points in this competition are awarded dynamically.

- More solves by other teams reduce the score.
- More elapsed time reduces the score.
- More attempts by your team reduce the score.

The live score shown is a first-attempt estimate until your team submits.`;
};

/**
 * Parse awarded points from submission response
 */
export const getAwardedPointsFromSubmission = (response) => {
  if (!response || !response.submission) {
    return null;
  }

  return response.submission.awarded_points || null;
};
