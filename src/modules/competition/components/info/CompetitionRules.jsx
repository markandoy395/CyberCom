import React, { useState, useRef } from 'react';
import { TiWarning } from '../../../../utils/icons';
import { useRules } from '../../../../utils/hooks';
import './CompetitionRules.css';

const CompetitionRules = ({ isModal = false, onAgree = () => {} }) => {
  const { rules } = useRules('competition');
  
  // Prevent multiple rapid button clicks
  const isClickingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const MIN_CLICK_DELAY = 500; // Minimum 500ms between clicks
  const [isDisabled, setIsDisabled] = useState(false);

  const handleAgreeClick = () => {
    // Prevent rapid multiple clicks
    const now = Date.now();
    if (isClickingRef.current) {
      return;
    }
    if (now - lastClickTimeRef.current < MIN_CLICK_DELAY) {
      return;
    }
    
    isClickingRef.current = true;
    lastClickTimeRef.current = now;
    setIsDisabled(true);
    
    // Call the callback
    onAgree();
    
    // Reset after a brief moment to allow next action
    setTimeout(() => {
      isClickingRef.current = false;
      setIsDisabled(false);
    }, 100);
  };

  if (isModal) {
    return (
      <div className="rules-modal-overlay">
        <div className="rules-modal">
          <div className="rules-modal-header">
            <TiWarning className="rules-icon" />
            <h2>Competition Rules & Safety Notice</h2>
          </div>

          <div className="rules-modal-content">
            <p className="rules-intro">
              Please read and understand these rules before proceeding with the competition.
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
              onClick={handleAgreeClick}
              disabled={isDisabled}
            >
              Close & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner version for competition screen
  return (
    <div className="rules-banner">
      <div className="banner-content">
        <TiWarning className="banner-icon" />
        <div className="banner-text">
          <strong>Competition Rules Active:</strong>
          <span>Developer Tools, Tab Switching, & Address Bar are disabled</span>
        </div>
      </div>
    </div>
  );
};

export default CompetitionRules;
