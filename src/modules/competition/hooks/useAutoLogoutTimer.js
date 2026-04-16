import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Isolated Auto-Logout Timer Hook
 * Manages countdown and automatic logout independently
 * Does not affect other components or state
 */
export const useAutoLogoutTimer = (isActive = true, logoutDelaySeconds = 300, onLogoutCallback = null) => {
  const [timeRemaining, setTimeRemaining] = useState(logoutDelaySeconds);
  const [isExpired, setIsExpired] = useState(false);
  const timerIntervalRef = useRef(null);
  const hasLoggedOutRef = useRef(false);

  const handleLogout = useCallback(() => {
    if (hasLoggedOutRef.current) return;
    hasLoggedOutRef.current = true;

    if (onLogoutCallback) {
      onLogoutCallback();
    } else {
      localStorage.removeItem("competitionSession");
      window.location.replace("/competition/login");
    }
  }, [onLogoutCallback]);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    // If under 60 seconds, just show the seconds number
    if (mins === 0) {
      return secs.toString();
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!isActive) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          // Auto logout when timer expires
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isActive, handleLogout]);

  const cancelLogout = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    hasLoggedOutRef.current = false;
    setTimeRemaining(logoutDelaySeconds);
    setIsExpired(false);
  }, [logoutDelaySeconds]);

  const forceLogout = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    handleLogout();
  }, [handleLogout]);

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    cancelLogout,
    forceLogout,
  };
};

export default useAutoLogoutTimer;
