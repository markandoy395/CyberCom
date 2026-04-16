import React from "react";
import { FaCircleXmark, FaCircleCheck, BiCheckCircle } from "../../../../utils/icons";
import "./CompetitionEndedLoginModal.css";

/**
 * Competition Ended Login Modal
 * Displays when teams attempt to login to a done competition
 */
const CompetitionEndedLoginModal = ({ competitionName, onClose, onGoHome }) => {
  return (
    <div className="competition-ended-login-overlay">
      <div className="competition-ended-login-modal">
        {/* Header */}
        <div className="ended-login-header">
          <div className="ended-login-icon">
            <FaCircleXmark />
          </div>
          <h2 className="ended-login-title">Competition Finished</h2>
        </div>

        {/* Content */}
        <div className="ended-login-content">
          <p className="ended-login-main-text">
            The competition <strong>"{competitionName}"</strong> has ended.
          </p>
          
          <div className="ended-login-message">
            <p className="ended-login-secondary-text">
              This competition is no longer accepting new participants or logins. All results have been finalized and archived.
            </p>
          </div>

          {/* Info Box */}
          <div className="ended-login-info-box">
            <div className="info-item">
              <span className="info-icon"><BiCheckCircle /></span>
              <p>Final results are available for viewing</p>
            </div>
            <div className="info-item">
              <span className="info-icon"><FaCircleCheck /></span>
              <p>Leaderboards and rankings are finalized</p>
            </div>
            <div className="info-item">
              <span className="info-icon"><FaCircleXmark /></span>
              <p>No new submissions or changes allowed</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="ended-login-actions">
          <button
            className="btn-primary btn-go-home"
            onClick={onGoHome}
            title="Return to home page"
          >
            Go to Home
          </button>
          <button
            className="btn-secondary btn-close-modal"
            onClick={onClose}
            title="Close this message"
          >
            Close
          </button>
        </div>

        {/* Footer */}
        <div className="ended-login-footer">
          <p className="footer-message">
            Thank you for participating! Check back for upcoming competitions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompetitionEndedLoginModal;
