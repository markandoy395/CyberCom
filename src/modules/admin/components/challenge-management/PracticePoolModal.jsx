import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import ActionButton from '../../../../common/ActionButton';
import {
  CATEGORY_ID_TO_KEY,
  CATEGORY_NAMES,
  CATEGORIES,
} from '../../../../utils/constants';
import { FaXmark } from '../../../../utils/icons';
import './AddChallengesModal.css';

const PracticePoolModal = ({
  showModal,
  onClose,
  availableChallenges,
  selectedChallenges,
  onSelectionChange,
  onConfirm,
  isLoading,
}) => {
  const portalElement = useMemo(() => {
    let element = document.getElementById('practice-pool-modal-portal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'practice-pool-modal-portal';
      document.body.appendChild(element);
    }
    return element;
  }, []);

  useEffect(() => {
    if (!showModal) {
      return undefined;
    }

    const handleEsc = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.top = 'auto';
      window.removeEventListener('keydown', handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [onClose, showModal]);

  if (!showModal) {
    return null;
  }

  const handleBackdropClick = event => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(availableChallenges.map(challenge => challenge.id)));
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  const handleSelectByCategory = categoryId => {
    onSelectionChange(new Set(
      availableChallenges
        .filter(challenge => challenge.category_id === categoryId)
        .map(challenge => challenge.id)
    ));
  };

  return ReactDOM.createPortal(
    <div className="add-challenges-modal-backdrop" onClick={handleBackdropClick}>
      <div className="add-challenges-modal">
        <div className="add-challenges-modal-header">
          <div>
            <h3>Add Practice Challenges</h3>
            <p>Select CyberCom challenges to include in the practice pool</p>
          </div>
          <button onClick={onClose} className="modal-close-btn" title="Close">
            <FaXmark size={20} />
          </button>
        </div>

        {availableChallenges.length > 0 && (
          <div className="quick-select-buttons">
            <div className="quick-select-group">
              <button onClick={handleSelectAll} className="quick-select-btn">
                Select All
              </button>
              <button onClick={handleClearAll} className="quick-select-btn secondary">
                Clear All
              </button>
            </div>

            <div className="quick-select-divider">By Category:</div>

            <div className="quick-select-group">
              {CATEGORIES.map(category => {
                const count = availableChallenges.filter(
                  challenge => challenge.category_id === category.id
                ).length;

                if (count === 0) {
                  return null;
                }

                return (
                  <button
                    key={category.id}
                    onClick={() => handleSelectByCategory(category.id)}
                    className="quick-select-btn category-btn"
                  >
                    {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="add-challenges-modal-body">
          {availableChallenges.length === 0 ? (
            <div className="add-challenges-modal-body-empty">
              <p>All CyberCom challenges are already in the practice pool</p>
            </div>
          ) : (
            <div className="challenges-selection-grid">
              {availableChallenges.map(challenge => (
                <div
                  key={challenge.id}
                  onClick={() => {
                    const nextSelected = new Set(selectedChallenges);

                    if (nextSelected.has(challenge.id)) {
                      nextSelected.delete(challenge.id);
                    } else {
                      nextSelected.add(challenge.id);
                    }

                    onSelectionChange(nextSelected);
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
                    <h4 className="challenge-selection-title">{challenge.title}</h4>
                    <p className="challenge-selection-meta">
                      {CATEGORY_NAMES[CATEGORY_ID_TO_KEY[challenge.category_id]] || 'Unknown'}
                      {' • '}
                      {challenge.difficulty}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="add-challenges-modal-footer">
          <button onClick={onClose} disabled={isLoading} className="btn btn-secondary">
            Cancel
          </button>
          <ActionButton
            onClick={onConfirm}
            disabled={selectedChallenges.size === 0}
            className="btn btn-primary"
            variant="custom"
            size="custom"
            isLoading={isLoading}
            loadingText="Adding..."
          >
            Add to Practice{selectedChallenges.size > 0 ? ` (${selectedChallenges.size})` : ''}
          </ActionButton>
        </div>
      </div>
    </div>,
    portalElement
  );
};

export default PracticePoolModal;
