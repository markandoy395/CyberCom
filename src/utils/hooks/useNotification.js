import { useState, useCallback } from 'react';

/**
 * Unified hook for NotificationModal component
 * Provides simplified API for showing notifications with different types
 * 
 * @param {number} autoDismissMs - Auto dismiss timeout in milliseconds (0 = no auto dismiss)
 * @param {string} position - Default position: 'center', 'top-center', 'top-right', etc.
 */
const useNotification = (autoDismissMs = 3000, position = 'top-center') => {
  const [notification, setNotification] = useState(null);

  const show = useCallback((type, title, message, actionLabel = null, onAction = null) => {
    setNotification({
      type, // 'success', 'error', 'warning', 'info'
      title,
      message,
      actionLabel,
      onAction,
    });
  }, []);

  const showSuccess = useCallback((title, message) => {
    show('success', title, message);
  }, [show]);

  const showError = useCallback((title, message) => {
    show('error', title, message);
  }, [show]);

  const showWarning = useCallback((title, message) => {
    show('warning', title, message);
  }, [show]);

  const showInfo = useCallback((title, message) => {
    show('info', title, message);
  }, [show]);

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    show,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss,
    position,
    duration: autoDismissMs,
  };
};

export default useNotification;
