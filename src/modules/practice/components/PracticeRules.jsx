import React from 'react';
import { TiWarning } from '../../../utils/icons';
import { useRules } from '../../../utils/hooks';
import './PracticeRules.css';

const PracticeRules = ({ isModal = false, onAgree = () => {} }) => {
  const { rules } = useRules('practice');

  if (isModal) {
    return (
      <div className="rules-modal-overlay">
        <div className="rules-modal">
          <div className="rules-modal-header">
            <TiWarning className="rules-icon" />
            <h2>Practice Rules & Guidelines</h2>
          </div>

          <div className="rules-modal-content">
            <p className="rules-intro">
              Please read and understand these rules before practicing challenges.
            </p>

            <div className="rules-list">
              {rules.map((rule, index) => (
                <div key={index} className="rule-item">
                  <span className="rule-number">{index + 1}</span>
                  <span className="rule-text">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rules-modal-footer">
            <button 
              className="btn btn-primary btn-block"
              onClick={onAgree}
            >
              Close & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner version for practice screen
  return (
    <div className="rules-banner">
      <div className="banner-content">
        <TiWarning className="banner-icon" />
        <div className="banner-text">
          <strong>Practice Rules Active:</strong>
          <span>Please respect community guidelines and maintain academic integrity</span>
        </div>
      </div>
    </div>
  );
};

export default PracticeRules;
