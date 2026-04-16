import { scoringDefaults } from './config.js';

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

const resolveTimeScaleMinutes = (competitionDurationMinutes, explicitScaleMinutes = null) => {
  const normalizedExplicitScale = toFiniteNumber(explicitScaleMinutes, 0);

  if (normalizedExplicitScale > 0) {
    return normalizedExplicitScale;
  }

  const configuredScale = toFiniteNumber(scoringDefaults.defaultTimeScaleMinutes, 0);

  if (configuredScale > 0) {
    return configuredScale;
  }

  const normalizedCompetitionDuration = toFiniteNumber(competitionDurationMinutes, 0);

  if (normalizedCompetitionDuration > 0) {
    return normalizedCompetitionDuration;
  }

  return Math.max(toFiniteNumber(scoringDefaults.fallbackTimeScaleMinutes, 180), 1);
};

// Implements the Linear-Exponential Decay (L-ED) formula used for competition scoring.
// The caller is responsible for deciding when this formula should be used.
export const calculateLinearExponentialDecayScore = ({
  maxScore,
  minScore = null,
  minScoreFloor = null,
  solveCount,
  solveTimeMinutes,
  attempts,
  competitionDurationMinutes = null,
  originMinutes = scoringDefaults.timeOriginMinutes,
  offsetMinutes = scoringDefaults.timeOffsetMinutes,
  scaleMinutes = null,
  timeDecay = scoringDefaults.timeDecay,
  solverDecayConstant = scoringDefaults.solverDecayConstant,
  attemptPenaltyConstant = scoringDefaults.attemptPenaltyConstant,
  solverWeight = scoringDefaults.solverWeight,
  timeWeight = scoringDefaults.timeWeight,
} = {}) => {
  const safeMaxScore = Math.max(Math.round(toFiniteNumber(maxScore, 0)), 0);
  const safeMinScore = resolveMinScore(
    safeMaxScore,
    minScore ?? minScoreFloor
  );
  const safeSolveCount = Math.max(Math.round(toFiniteNumber(solveCount, 1)), 1);
  const safeSolveTimeMinutes = Math.max(toFiniteNumber(solveTimeMinutes, 0), 0);
  const safeAttempts = Math.max(Math.round(toFiniteNumber(attempts, 1)), 1);
  const safeOriginMinutes = Math.max(toFiniteNumber(originMinutes, 0), 0);
  const safeOffsetMinutes = Math.max(toFiniteNumber(offsetMinutes, 0), 0);
  const safeScaleMinutes = resolveTimeScaleMinutes(competitionDurationMinutes, scaleMinutes);
  const safeTimeDecay = clamp(toFiniteNumber(timeDecay, 0), 0, 0.9999);
  const safeSolverDecayConstant = Math.max(toFiniteNumber(solverDecayConstant, 0), 0);
  const safeAttemptPenaltyConstant = Math.max(toFiniteNumber(attemptPenaltyConstant, 0), 0);
  const normalizedWeights = normalizeWeights(solverWeight, timeWeight);
  const scalingFactor = safeScaleMinutes / Math.max(1 - safeTimeDecay, EPSILON);
  const timeDelta = Math.max(0, Math.abs(safeSolveTimeMinutes - safeOriginMinutes) - safeOffsetMinutes);

  // E(s): solver-based exponential decay.
  const solverComponent = safeMinScore
    + ((safeMaxScore - safeMinScore) * Math.exp(-safeSolverDecayConstant * safeSolveCount));

  // L(t): time-based linear decay normalized to the range [0, 1].
  const timeComponent = Math.max((scalingFactor - timeDelta) / scalingFactor, 0);

  // A(a): exponential penalty for repeated attempts.
  const attemptPenalty = Math.exp(-safeAttemptPenaltyConstant * (safeAttempts - 1));

  // H: weighted hybrid score before the minimum-score threshold is applied.
  const hybridScore = (
    (normalizedWeights.solverWeight * solverComponent)
    + (normalizedWeights.timeWeight * safeMaxScore * timeComponent)
  ) * attemptPenalty;

  // Final Score = max(H, S_min)
  const finalScore = Math.max(hybridScore, safeMinScore);

  return {
    model: 'linear-exponential-decay',
    finalScore: Math.round(finalScore),
    hybridScore,
    maxScore: safeMaxScore,
    minScore: safeMinScore,
    solveCount: safeSolveCount,
    solveTimeMinutes: safeSolveTimeMinutes,
    attempts: safeAttempts,
    competitionDurationMinutes: toFiniteNumber(competitionDurationMinutes, 0),
    parameters: {
      originMinutes: safeOriginMinutes,
      offsetMinutes: safeOffsetMinutes,
      scaleMinutes: safeScaleMinutes,
      timeDecay: safeTimeDecay,
      solverDecayConstant: safeSolverDecayConstant,
      attemptPenaltyConstant: safeAttemptPenaltyConstant,
      solverWeight: normalizedWeights.solverWeight,
      timeWeight: normalizedWeights.timeWeight,
    },
    components: {
      solverComponent,
      timeComponent,
      attemptPenalty,
      scalingFactor,
      timeDelta,
    },
  };
};
