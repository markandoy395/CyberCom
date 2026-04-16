/**
 * Utility to display scoring information in competition mode
 * Uses the Linear-Exponential Decay (L-ED) formula
 */

export const getScoringInfo = () => {
  return {
    model: 'Linear-Exponential Decay (L-ED)',
    description: 'Points are awarded dynamically based on solver count, time, and attempts',
    factors: [
      'Solver Count: Early solvers earn more points',
      'Time Elapsed: Faster solutions earn more points',
      'Team Attempts: Fewer team attempts earn more points'
    ]
  };
};

/**
 * Format points display for competition challenges
 * Shows base points with decay formula note
 */
export const formatCompetitionPoints = (basePoints, _solveCount = null, isSolved = false) => {
  return {
    basePoints,
    displayText: isSolved ? `Earned Points` : `Base: ${basePoints} pts`,
    hasDecayFormula: !isSolved,
    isDecayBased: true
  };
};

/**
 * Get scoring explanation for modal
 */
export const getScoringExplanation = () => {
  return `Points in this competition are awarded using a dynamic decay formula that considers:
• How many teams have solved this challenge
• How quickly you solved it from the competition start
• How many attempts you used

Early solvers who use fewer attempts earn more points.`;
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
