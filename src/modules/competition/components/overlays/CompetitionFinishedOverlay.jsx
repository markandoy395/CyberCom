import { memo } from "react";

const CompetitionFinishedOverlay = memo(({ competitionData, onBackToHome }) => {
  return (
    <div className="competition-finished-overlay">
      <div className="finished-modal">
        <div className="finished-icon">🏁</div>
        <h1 className="finished-title">Competition Finished!</h1>
        <p className="finished-message">Your time is up. Great effort!</p>
        <div className="finished-stats">
          <div className="finished-stat">
            <span className="stat-label">Final Score:</span>
            <span className="stat-value">{competitionData.score} pts</span>
          </div>
          <div className="finished-stat">
            <span className="stat-label">Challenges Solved:</span>
            <span className="stat-value">
              {competitionData.solved}/{competitionData.totalChallenges}
            </span>
          </div>
          <div className="finished-stat">
            <span className="stat-label">Success Rate:</span>
            <span className="stat-value">
              {competitionData.successRate}%
            </span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onBackToHome}>
          Back to Home
        </button>
      </div>
    </div>
  );
});

CompetitionFinishedOverlay.displayName = 'CompetitionFinishedOverlay';

export default CompetitionFinishedOverlay;
