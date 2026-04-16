import React from 'react';
import { createPortal } from 'react-dom';
import './BaseModal.css';
import './ErrorModal.css';

/**
 * Error/Alert Modal
 * 
 * Props:
 * - isOpen: boolean to show/hide modal
 * - type: 'error' | 'success' | 'warning' | 'info' (default: 'error')
 * - title: modal title
 * - message: error/alert message
 * - onClose: callback when close is clicked
 * - autoClose: auto close after ms (0 = disabled, default: 0)
 */
const ErrorModal = ({
  isOpen,
  type = 'error',
  title,
  message,
  onClose,
  autoClose = 0,
}) => {
  React.useEffect(() => {
    if (!isOpen || !autoClose) return;

    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, autoClose);

    return () => clearTimeout(timer);
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return createPortal(
    <div className="admin-modal-backdrop" onClick={handleBackdropClick}>
      <div className={`admin-modal-panel error-modal error-modal-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className={`error-icon error-icon-${type}`}>
          {type === 'error' && '❌'}
          {type === 'success' && '✅'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </div>

        <h2 className="error-title">{title}</h2>
        <p className="error-message">{message}</p>

        <button
          className={`btn-${type}`}
          onClick={handleBackdropClick}
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ErrorModal;
