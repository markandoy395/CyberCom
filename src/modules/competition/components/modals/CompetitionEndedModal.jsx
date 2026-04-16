import React from "react";
import { FaCircleCheck, BiCheckCircle, BiTrendingUp } from "../../../../utils/icons";
import "./CompetitionEndedModal.css";

/**
 * Competition Ended Modal
 * Displays when competition status is "done"
 * Shows auto-logout countdown timer
 */
const CompetitionEndedModal = ({
  competitionName,
  timeRemaining,
  formattedTime,
  totalTimeout = 10,
  onContinueViewing,
  onLogoutNow,
}) => {
  return (
    <div className="competition-ended-overlay">
      <div className="competition-ended-modal">
        {/* Header */}
        <div className="modal-header-section">
          <div className="modal-badge-icon"><FaCircleCheck /></div>
          <h2 className="modal-heading">Competition Ended</h2>
        </div>

        {/* Message */}
        <div className="modal-message-section">
          <p className="modal-main-text">
            The competition "<strong>{competitionName}</strong>" has ended.
          </p>
          <p className="modal-secondary-text">
            You are now viewing archived data. No new submissions can be made.
          </p>
        </div>

        {/* Timer Section */}
        <div className="timer-section">
          <p className="timer-label">Auto-logout in:</p>
          <div className="timer-display">
            <span className="timer-time">{formattedTime}</span>
            <span className="timer-unit">seconds</span>
          </div>
          <div className="timer-progress-bar">
            <div
              className="timer-progress-fill"
              style={{ width: `${(timeRemaining / totalTimeout) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Information */}
        <div className="modal-info-section">
          <div className="info-item">
            <span className="info-icon"><BiTrendingUp /></span>
            <p>You can continue viewing your competition results.</p>
          </div>
          <div className="info-item">
            <span className="info-icon"><BiCheckCircle /></span>
            <p>Flag submission is disabled for ended competitions.</p>
          </div>
          <div className="info-item">
            <span className="info-icon"><FaCircleCheck /></span>
            <p>You will be automatically logged out in {formattedTime}.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn-secondary continue-btn"
            onClick={onContinueViewing}
            title="Keep viewing competition results"
          >
            Continue Viewing
          </button>
          <button
            className="btn-danger logout-btn"
            onClick={onLogoutNow}
            title="Logout immediately"
          >
            Logout Now
          </button>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <p className="footer-text">
            Your results will be saved for future reference.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompetitionEndedModal;
