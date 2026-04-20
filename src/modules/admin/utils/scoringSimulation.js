import {
  DEFAULT_COMPETITION_FORM,
  MAX_COMPETITION_DURATION_HOURS,
} from "../constants";

const EPSILON = 0.000001;

const DEFAULT_SCORING_SETTINGS = DEFAULT_COMPETITION_FORM.scoringSettings;

export const DEFAULT_SCORING_SIMULATION_INPUTS = Object.freeze({
  challengePoints: 500,
  solveCount: 1,
  solveTimeMinutes: 30,
  attempts: 1,
  competitionDurationMinutes: MAX_COMPETITION_DURATION_HOURS * 60,
});

export const DEFAULT_TEAM_SCORE_SIMULATION_INPUTS = Object.freeze({
  teamCount: 10,
  firstSolveTimeMinutes: 15,
  lastSolveTimeMinutes: MAX_COMPETITION_DURATION_HOURS * 60 * 0.85,
  firstAttempts: 1,
  lastAttempts: 3,
});

export const SCORING_SIMULATION_SCENARIOS = Object.freeze([
  {
    id: "first-blood",
    title: "First Blood",
    description: "Early clean solve with no mistakes.",
    solveCount: 1,
    attempts: 1,
    timeRatio: 0.05,
  },
  {
    id: "mid-pack",
    title: "Mid Pack",
    description: "Several teams solved already and one retry was needed.",
    solveCount: 5,
    attempts: 2,
    timeRatio: 0.5,
  },
  {
    id: "late-grind",
    title: "Late Grind",
    description: "Late solve after repeated failed attempts.",
    solveCount: 10,
    attempts: 3,
    timeRatio: 0.85,
  },
]);

const toFiniteNumber = (value, fallback = 0) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const interpolate = (start, end, ratio) => start + ((end - start) * ratio);

const normalizeWeights = (solverWeight, timeWeight) => {
  const safeSolverWeight = Math.max(toFiniteNumber(solverWeight, 0), 0);
  const safeTimeWeight = Math.max(toFiniteNumber(timeWeight, 0), 0);
  const totalWeight = safeSolverWeight + safeTimeWeight;

  if (totalWeight <= 0) {
    return {
      solverWeight: DEFAULT_SCORING_SETTINGS.solverWeight,
      timeWeight: DEFAULT_SCORING_SETTINGS.timeWeight,
    };
  }

  return {
    solverWeight: safeSolverWeight / totalWeight,
    timeWeight: safeTimeWeight / totalWeight,
  };
};

const resolveMinScore = (maxScore, explicitMinScore = null) => {
  const rawMinScore = explicitMinScore ?? DEFAULT_SCORING_SETTINGS.minScoreFloor;

  return clamp(Math.round(toFiniteNumber(rawMinScore, 0)), 0, maxScore);
};

const resolveTimeScaleMinutes = competitionDurationMinutes => {
  const safeDuration = toFiniteNumber(
    competitionDurationMinutes,
    DEFAULT_SCORING_SIMULATION_INPUTS.competitionDurationMinutes
  );

  return Math.max(Math.round(safeDuration), 1);
};

export const normalizeScoringSettings = settings => {
  const mergedSettings = {
    ...DEFAULT_SCORING_SETTINGS,
    ...(settings || {}),
  };
  const normalizedWeights = normalizeWeights(
    mergedSettings.solverWeight,
    mergedSettings.timeWeight
  );

  return {
    solverWeight: normalizedWeights.solverWeight,
    timeWeight: normalizedWeights.timeWeight,
    solverDecayConstant: Math.max(
      toFiniteNumber(
        mergedSettings.solverDecayConstant,
        DEFAULT_SCORING_SETTINGS.solverDecayConstant
      ),
      0
    ),
    attemptPenaltyConstant: Math.max(
      toFiniteNumber(
        mergedSettings.attemptPenaltyConstant,
        DEFAULT_SCORING_SETTINGS.attemptPenaltyConstant
      ),
      0
    ),
    minScoreFloor: Math.max(
      Math.round(
        toFiniteNumber(
          mergedSettings.minScoreFloor,
          DEFAULT_SCORING_SETTINGS.minScoreFloor
        )
      ),
      0
    ),
  };
};

export const calculateScoringSimulation = ({
  maxScore,
  solveCount,
  solveTimeMinutes,
  attempts,
  competitionDurationMinutes,
  minScoreFloor,
  solverDecayConstant,
  attemptPenaltyConstant,
  solverWeight,
  timeWeight,
} = {}) => {
  const safeMaxScore = Math.max(Math.round(toFiniteNumber(maxScore, 0)), 0);
  const safeSolveCount = Math.max(Math.round(toFiniteNumber(solveCount, 1)), 1);
  const safeSolveTimeMinutes = Math.max(toFiniteNumber(solveTimeMinutes, 0), 0);
  const safeAttempts = Math.max(Math.round(toFiniteNumber(attempts, 1)), 1);
  const safeCompetitionDurationMinutes = resolveTimeScaleMinutes(
    competitionDurationMinutes
  );
  const normalizedSettings = normalizeScoringSettings({
    minScoreFloor,
    solverDecayConstant,
    attemptPenaltyConstant,
    solverWeight,
    timeWeight,
  });
  const safeMinScore = resolveMinScore(
    safeMaxScore,
    normalizedSettings.minScoreFloor
  );
  const scalingFactor = safeCompetitionDurationMinutes / Math.max(1, EPSILON);
  const timeDelta = safeSolveTimeMinutes;

  const solverComponent = safeMinScore
    + (
      (safeMaxScore - safeMinScore)
      * Math.exp(-normalizedSettings.solverDecayConstant * safeSolveCount)
    );
  const timeComponent = Math.max((scalingFactor - timeDelta) / scalingFactor, 0);
  const attemptPenalty = Math.exp(
    -normalizedSettings.attemptPenaltyConstant * (safeAttempts - 1)
  );
  const hybridScore = (
    (normalizedSettings.solverWeight * solverComponent)
    + (normalizedSettings.timeWeight * safeMaxScore * timeComponent)
  ) * attemptPenalty;
  const finalScore = Math.max(hybridScore, safeMinScore);
  const floorApplied = hybridScore < safeMinScore;

  return {
    model: "linear-exponential-decay",
    finalScore: Math.round(finalScore),
    hybridScore,
    maxScore: safeMaxScore,
    minScore: safeMinScore,
    solveCount: safeSolveCount,
    solveTimeMinutes: safeSolveTimeMinutes,
    attempts: safeAttempts,
    competitionDurationMinutes: safeCompetitionDurationMinutes,
    floorApplied,
    retentionRatio: safeMaxScore > 0 ? finalScore / safeMaxScore : 0,
    parameters: normalizedSettings,
    components: {
      solverComponent,
      timeComponent,
      attemptPenalty,
      scalingFactor,
      timeDelta,
    },
  };
};

export const buildScenarioSimulation = ({
  scenario,
  challengePoints,
  competitionDurationMinutes,
  scoringSettings,
}) => {
  const safeDuration = resolveTimeScaleMinutes(competitionDurationMinutes);
  const solveTimeMinutes = Math.max(
    Math.round(safeDuration * scenario.timeRatio),
    1
  );

  return {
    ...scenario,
    solveTimeMinutes,
    result: calculateScoringSimulation({
      maxScore: challengePoints,
      solveCount: scenario.solveCount,
      solveTimeMinutes,
      attempts: scenario.attempts,
      competitionDurationMinutes: safeDuration,
      ...scoringSettings,
    }),
  };
};

export const buildTeamScoreSimulationRows = ({
  challengePoints,
  competitionDurationMinutes,
  scoringSettings,
  teamCount,
  firstSolveTimeMinutes,
  lastSolveTimeMinutes,
  firstAttempts,
  lastAttempts,
}) => {
  const safeCompetitionDurationMinutes = resolveTimeScaleMinutes(
    competitionDurationMinutes
  );
  const safeTeamCount = Math.max(Math.round(toFiniteNumber(teamCount, 1)), 1);
  const safeFirstSolveTime = clamp(
    Math.round(toFiniteNumber(firstSolveTimeMinutes, 0)),
    0,
    safeCompetitionDurationMinutes
  );
  const safeLastSolveTime = clamp(
    Math.round(
      toFiniteNumber(lastSolveTimeMinutes, safeCompetitionDurationMinutes)
    ),
    safeFirstSolveTime,
    safeCompetitionDurationMinutes
  );
  const safeFirstAttempts = Math.max(
    Math.round(toFiniteNumber(firstAttempts, 1)),
    1
  );
  const safeLastAttempts = Math.max(
    Math.round(toFiniteNumber(lastAttempts, safeFirstAttempts)),
    safeFirstAttempts
  );

  return Array.from({ length: safeTeamCount }, (_value, index) => {
    const solveCount = index + 1;
    const ratio = safeTeamCount === 1 ? 0 : index / (safeTeamCount - 1);
    const solveTimeMinutes = Math.round(
      interpolate(safeFirstSolveTime, safeLastSolveTime, ratio)
    );
    const attempts = Math.max(
      Math.round(interpolate(safeFirstAttempts, safeLastAttempts, ratio)),
      1
    );
    const result = calculateScoringSimulation({
      maxScore: challengePoints,
      solveCount,
      solveTimeMinutes,
      attempts,
      competitionDurationMinutes: safeCompetitionDurationMinutes,
      ...scoringSettings,
    });

    return {
      id: `team-${solveCount}`,
      name: `Team ${solveCount}`,
      solveCount,
      solveTimeMinutes,
      attempts,
      result,
    };
  });
};

export const formatMinutesLabel = minutes => {
  const safeMinutes = Math.max(Math.round(toFiniteNumber(minutes, 0)), 0);
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours <= 0) {
    return `${safeMinutes}m`;
  }

  if (remainingMinutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export const formatDecimal = (value, digits = 2) => {
  const numericValue = toFiniteNumber(value, 0);

  return numericValue.toFixed(digits);
};
