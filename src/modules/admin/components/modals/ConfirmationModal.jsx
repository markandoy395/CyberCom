import React from 'react';
import { createPortal } from 'react-dom';
import './BaseModal.css';
import './ConfirmationModal.css';

/**
 * Reusable Confirmation Modal
 * 
 * Props:
 * - isOpen: boolean to show/hide modal
 * - title: modal title
 * - message: confirmation message
 * - confirmText: text for confirm button (default: "Confirm")
 * - cancelText: text for cancel button (default: "Cancel")
 * - severity: 'info' | 'warning' | 'danger' (default: 'warning')
 * - onConfirm: callback when confirm is clicked
 * - onCancel: callback when cancel is clicked
 * - isLoading: boolean to show loading state on confirm button
 */
const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm && !isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel && !isLoading) {
      onCancel();
    }
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      handleCancel();
    }
  };

  return createPortal(
    <div className="admin-modal-backdrop" onClick={handleBackdropClick}>
      <div className="admin-modal-panel confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header confirmation-header-${severity}`}>
          <h2>{title}</h2>
        </div>

        <div className="modal-body">
          <p className="confirmation-message">{message}</p>
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`btn-${severity}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {confirmText}...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
