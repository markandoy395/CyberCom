import React, { useMemo, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { apiPost, API_ENDPOINTS } from '../../../../utils/api';
import ActionButton from '../../../../common/ActionButton';
import { CATEGORY_NAMES, CATEGORY_ID_TO_KEY, CATEGORIES } from '../../../../utils/constants';
import { FaXmark, FaCircleCheck, FaCircleXmark, FaTriangleExclamation } from '../../../../utils/icons';
import './AddChallengesModal.css';

const AddChallengesModal = ({
  showModal,
  onClose,
  availableChallenges,
  selectedChallenges,
  onSelectionChange,
  competitionId,
  competitionName = '',
  onSuccess,
  onError
}) => {
  // Initialize portal element with useMemo
  const portalElement = useMemo(() => {
    let element = document.getElementById("add-challenges-modal-portal");
    if (!element) {
      element = document.createElement("div");
      element.id = "add-challenges-modal-portal";
      document.body.appendChild(element);
    }
    return element;
  }, []);

  // State for tracking progress
  const [isLoading, setIsLoading] = useState(false);
  const [progressResults, setProgressResults] = useState({});

  // Close on ESC key and prevent body scroll
  useEffect(() => {
    if (!showModal) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Store scroll position and prevent scroll
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollY}px`;
    
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
      document.body.style.top = "auto";
      window.removeEventListener("keydown", handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [showModal, onClose]);

  // Close when clicking backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Select all challenges
  const handleSelectAll = () => {
    const allIds = new Set(availableChallenges.map(c => c.id));
    onSelectionChange(allIds);
  };

  // Clear all selections
  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  // Select challenges by category
  const handleSelectByCategory = (categoryId) => {
    const categoryIds = new Set(
      availableChallenges
        .filter(c => c.category_id === categoryId)
        .map(c => c.id)
    );
    onSelectionChange(categoryIds);
  };

  const handleBulkAdd = async () => {
    if (selectedChallenges.size === 0) {
      onError('Please select at least one challenge');
      return;
    }

    setIsLoading(true);
    setProgressResults({});
    
    let successCount = 0;
    let failCount = 0;
    let duplicateCount = 0;
    let errorMessage = '';
    const results = {};

    for (const challengeId of selectedChallenges) {
      try {
        // Find the challenge to get its points
        const challenge = availableChallenges.find(c => c.id === challengeId);
        if (!challenge) {
          failCount++;
          results[challengeId] = { status: 'failed', title: challenge?.title || `Challenge ${challengeId}` };
          setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'failed', title: challenge?.title || `Challenge ${challengeId}` } }));
          console.error(`Challenge ${challengeId} not found`);
          continue;
        }

        // Update UI to show this challenge is being processed
        setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'loading', title: challenge.title } }));

        const response = await apiPost(
          API_ENDPOINTS.ADMIN_COMPETITION_ADD_CHALLENGE(competitionId),
          { 
            challenge_id: challengeId,
            points: challenge.points
          }
        );
        
        if (response.success) {
          successCount++;
          setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'success', title: challenge.title } }));
        } else {
          failCount++;
          errorMessage = response.error || 'Unknown error';
          setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'failed', title: challenge.title, error: errorMessage } }));
          console.error(`Failed to add challenge ${challengeId}:`, response.error);
        }
      } catch (error) {
        const errorMsg = error.message || 'Unknown error';
        const challenge = availableChallenges.find(c => c.id === challengeId);
        
        // Check if it's a duplicate entry error (challenge already assigned)
        if (errorMsg.includes('Duplicate entry') || errorMsg.includes('unique_comp_challenge')) {
          duplicateCount++;
          setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'duplicate', title: challenge?.title || `Challenge ${challengeId}` } }));
          console.warn(`Challenge ${challengeId} is already assigned to this competition`);
        } else {
          failCount++;
          errorMessage = errorMsg;
          setProgressResults(prev => ({ ...prev, [challengeId]: { status: 'failed', title: challenge?.title || `Challenge ${challengeId}`, error: errorMsg } }));
          console.error(`Error adding challenge ${challengeId}:`, error);
        }
      }
    }

    // Build result message
    let message = '';
    if (successCount > 0) {
      message = `${successCount} challenge(s) added successfully`;
    }
    if (duplicateCount > 0) {
      message += (message ? '. ' : '') + `${duplicateCount} challenge(s) already assigned`;
    }
    if (failCount > 0) {
      message += (message ? '. ' : '') + `${failCount} failed${errorMessage ? ` - ${errorMessage}` : ''}`;
    }
    if (!message) {
      message = 'No challenges were added';
    }

    // Show success if at least one was added, even if some were duplicates
    const hasSuccess = successCount > 0 || (duplicateCount > 0 && failCount === 0);
    onSuccess(message, hasSuccess);
    
    setIsLoading(false);
    
    if (successCount > 0 || duplicateCount > 0) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  if (!showModal) return null;

  return ReactDOM.createPortal(
    <div className="add-challenges-modal-backdrop" onClick={handleBackdropClick}>
      <div className="add-challenges-modal">
        {/* Header */}
        <div className="add-challenges-modal-header">
          <div>
            <h3>Add Challenges</h3>
            <p>
              {competitionName
                ? `Select challenges to add to ${competitionName}`
                : 'Select challenges to add to this competition'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            title="Close"
          >
            <FaXmark size={20} />
          </button>
        </div>

        {/* Quick Select Buttons */}
        {availableChallenges.length > 0 && (
          <div className="quick-select-buttons">
            <div className="quick-select-group">
              <button
                onClick={handleSelectAll}
                className="quick-select-btn"
                title="Select all available challenges"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="quick-select-btn secondary"
                title="Clear all selections"
              >
                Clear All
              </button>
            </div>

            <div className="quick-select-divider">By Category:</div>

            <div className="quick-select-group">
              {CATEGORIES.map(category => {
                const count = availableChallenges.filter(c => c.category_id === category.id).length;
                if (count === 0) return null;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectByCategory(category.id)}
                    className="quick-select-btn category-btn"
                    title={`Select all ${category.name} challenges`}
                  >
                    {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="add-challenges-modal-body">
          {isLoading ? (
            <div className="progress-section">
              <div className="progress-header">
                <h4>Adding Challenges...</h4>
                <p className="progress-counter">
                  {Object.keys(progressResults).length} / {selectedChallenges.size}
                </p>
              </div>
              
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{
                    width: `${(Object.keys(progressResults).length / selectedChallenges.size) * 100}%`
                  }}
                />
              </div>

              <div className="progress-items">
                {Array.from(selectedChallenges).map(challengeId => {
                  const result = progressResults[challengeId];
                  const challenge = availableChallenges.find(c => c.id === challengeId);
                  
                  if (!result) {
                    return (
                      <div key={challengeId} className="progress-item pending">
                        <div className="progress-icon pending-icon">⟳</div>
                        <span className="progress-title">{challenge?.title || `Challenge ${challengeId}`}</span>
                        <span className="progress-status">Pending</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div key={challengeId} className={`progress-item ${result.status}-item`}>
                      {result.status === 'loading' && (
                        <>
                          <div className="progress-icon loading-icon">⟳</div>
                          <span className="progress-title">{result.title}</span>
                          <span className="progress-status">Adding...</span>
                        </>
                      )}
                      {result.status === 'success' && (
                        <>
                          <FaCircleCheck style={{ color: '#22c55e', minWidth: '20px', minHeight: '20px' }} size={20} />
                          <span className="progress-title">{result.title}</span>
                          <span className="progress-status success">Added</span>
                        </>
                      )}
                      {result.status === 'duplicate' && (
                        <>
                          <FaTriangleExclamation style={{ color: '#f59e0b', minWidth: '20px', minHeight: '20px' }} size={20} />
                          <span className="progress-title">{result.title}</span>
                          <span className="progress-status duplicate">Already Added</span>
                        </>
                      )}
                      {result.status === 'failed' && (
                        <>
                          <FaCircleXmark style={{ color: '#ef4444', minWidth: '20px', minHeight: '20px' }} size={20} />
                          <span className="progress-title">{result.title}</span>
                          <span className="progress-status failed">Failed</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : availableChallenges.length === 0 ? (
            <div className="add-challenges-modal-body-empty">
              <p>All challenges are already assigned to this competition</p>
            </div>
          ) : (
            <div className="challenges-selection-grid">
              {availableChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  onClick={() => {
                    const newSelected = new Set(selectedChallenges);
                    if (newSelected.has(challenge.id)) {
                      newSelected.delete(challenge.id);
                    } else {
                      newSelected.add(challenge.id);
                    }
                    onSelectionChange(newSelected);
                  }}
                  className={`challenge-selection-item ${selectedChallenges.has(challenge.id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChallenges.has(challenge.id)}
                    onChange={() => {}}
                    className="challenge-selection-checkbox"
                  />
                  <div className="challenge-selection-content">
                    <h4 className="challenge-selection-title">
                      {challenge.title}
                    </h4>
                    <p className="challenge-selection-meta">
                      {CATEGORY_NAMES[CATEGORY_ID_TO_KEY[challenge.category_id]] || 'Unknown'} • {challenge.difficulty} • {challenge.points} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="add-challenges-modal-footer">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <ActionButton
            onClick={handleBulkAdd}
            disabled={selectedChallenges.size === 0}
            className="btn btn-primary"
            variant="custom"
            size="custom"
            isLoading={isLoading}
            loadingText="Adding..."
          >
            Add {selectedChallenges.size > 0 ? `(${selectedChallenges.size})` : ''} Challenge{selectedChallenges.size !== 1 ? 's' : ''}
          </ActionButton>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default AddChallengesModal;
