const parseEnvNumber = (name, fallback) => {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return fallback;
  }

  const parsedValue = Number.parseFloat(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseOptionalEnvNumber = name => {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }

  const parsedValue = Number.parseFloat(rawValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const normalizeWeights = (solverWeight, timeWeight) => {
  const safeSolverWeight = Math.max(solverWeight, 0);
  const safeTimeWeight = Math.max(timeWeight, 0);
  const totalWeight = safeSolverWeight + safeTimeWeight;

  if (totalWeight <= 0) {
    return { solverWeight: 0.7, timeWeight: 0.3 };
  }

  return {
    solverWeight: safeSolverWeight / totalWeight,
    timeWeight: safeTimeWeight / totalWeight,
  };
};

// These are global defaults for the competition scoring formula only.
// Practice mode does not use the L-ED model and still awards the challenge's static points.
const rawSolverWeight = parseEnvNumber('CTF_SCORING_SOLVER_WEIGHT', 0.7);
const rawTimeWeight = parseEnvNumber('CTF_SCORING_TIME_WEIGHT', 0.3);
const normalizedWeights = normalizeWeights(rawSolverWeight, rawTimeWeight);

export const scoringDefaults = {
  // Minimum score protection:
  // If the computed score drops too far, the final score is clamped to at least this floor.
  minScoreRatio: parseEnvNumber('CTF_SCORING_MIN_SCORE_RATIO', 0.3),
  minScoreFloor: parseEnvNumber('CTF_SCORING_MIN_SCORE_FLOOR', 10),

  // Exponential decay for the number of successful solvers.
  solverDecayConstant: parseEnvNumber('CTF_SCORING_SOLVER_DECAY', 0.12),

  // Exponential penalty for repeated attempts.
  attemptPenaltyConstant: parseEnvNumber('CTF_SCORING_ATTEMPT_DECAY', 0.35),

  // Linear time-decay controls.
  timeOriginMinutes: parseEnvNumber('CTF_SCORING_TIME_ORIGIN_MINUTES', 0),
  timeOffsetMinutes: parseEnvNumber('CTF_SCORING_TIME_OFFSET_MINUTES', 0),
  timeDecay: parseEnvNumber('CTF_SCORING_TIME_DECAY', 0),
  defaultTimeScaleMinutes: parseOptionalEnvNumber('CTF_SCORING_TIME_SCALE_MINUTES'),
  fallbackTimeScaleMinutes: parseEnvNumber('CTF_SCORING_TIME_FALLBACK_MINUTES', 180),

  // Hybrid weighting between solver-based decay and time-based decay.
  solverWeight: normalizedWeights.solverWeight,
  timeWeight: normalizedWeights.timeWeight,
};

export const scoringEnvVarNames = [
  'CTF_SCORING_MIN_SCORE_RATIO',
  'CTF_SCORING_MIN_SCORE_FLOOR',
  'CTF_SCORING_SOLVER_DECAY',
  'CTF_SCORING_ATTEMPT_DECAY',
  'CTF_SCORING_TIME_ORIGIN_MINUTES',
  'CTF_SCORING_TIME_OFFSET_MINUTES',
  'CTF_SCORING_TIME_DECAY',
  'CTF_SCORING_TIME_SCALE_MINUTES',
  'CTF_SCORING_TIME_FALLBACK_MINUTES',
  'CTF_SCORING_SOLVER_WEIGHT',
  'CTF_SCORING_TIME_WEIGHT',
];
