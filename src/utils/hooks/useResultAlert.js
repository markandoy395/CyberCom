import { useState, useEffect, useCallback } from 'react';
import { FaCircleCheck, FaCircleXmark } from '../icons';

/**
 * Unified hook for managing result alerts across admin components
 * Replaces duplicate showResult() in 4+ components
 * @param {number} autoDismissMs - Auto dismiss timeout in milliseconds (0 = no auto dismiss)
 */
const useResultAlert = (autoDismissMs = 3000) => {
  const [result, setResult] = useState(null);

  // Auto-dismiss alert after timeout
  useEffect(() => {
    if (!result || autoDismissMs <= 0) {
      return;
    }
    
    const timer = setTimeout(() => {
      setResult(null);
    }, autoDismissMs);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const showSuccess = useCallback((message) => {
    setResult({
      success: true,
      message,
      icon: FaCircleCheck,
    });
  }, []);

  const showError = useCallback((message) => {
    setResult({
      success: false,
      message,
      icon: FaCircleXmark,
    });
  }, []);

  const show = useCallback((message, success = true) => {
    if (success) {
      showSuccess(message);
    } else {
      showError(message);
    }
  }, [showSuccess, showError]);

  const dismiss = useCallback(() => {
    setResult(null);
  }, []);

  return {
    result,
    show,
    showSuccess,
    showError,
    dismiss,
  };
};

export default useResultAlert;
