import { memo } from "react";

const CompetitionPausedOverlay = memo(({ pauseTimeRemaining }) => {
  return (
    <div className="competition-paused-overlay">
      <div className="paused-modal">
        <div className="paused-icon">⏸️</div>
        <h1 className="paused-title">PAUSED</h1>
        <p className="paused-message">The competition has been paused by the administrator</p>
        {pauseTimeRemaining && (
          <div className="pause-countdown">
            <p className="pause-timer-label">Resumes in:</p>
            <p className="pause-timer-display">{pauseTimeRemaining}</p>
          </div>
        )}
        <p className="paused-info">Your progress is safe. Waiting to resume...</p>
      </div>
    </div>
  );
});

CompetitionPausedOverlay.displayName = 'CompetitionPausedOverlay';

export default CompetitionPausedOverlay;
