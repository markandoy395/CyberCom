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
  const deadlineRef = useRef(null);
  const hasLoggedOutRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

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

  const syncTimeRemaining = useCallback(() => {
    if (!deadlineRef.current) {
      setTimeRemaining(0);
      return;
    }

    const nextTimeRemaining = Math.max(
      Math.ceil((deadlineRef.current - Date.now()) / 1000),
      0
    );

    setTimeRemaining((currentTimeRemaining) => (
      currentTimeRemaining === nextTimeRemaining
        ? currentTimeRemaining
        : nextTimeRemaining
    ));

    if (nextTimeRemaining <= 0) {
      setIsExpired(true);
      clearTimer();
      handleLogout();
    }
  }, [clearTimer, handleLogout]);

  useEffect(() => {
    clearTimer();

    if (!isActive) {
      deadlineRef.current = null;
      setTimeRemaining(logoutDelaySeconds);
      setIsExpired(false);
      return undefined;
    }

    hasLoggedOutRef.current = false;
    setIsExpired(false);
    deadlineRef.current = Date.now() + (logoutDelaySeconds * 1000);
    setTimeRemaining(logoutDelaySeconds);
    syncTimeRemaining();

    // Update frequently and derive the visible second from the real deadline.
    timerIntervalRef.current = setInterval(syncTimeRemaining, 250);

    return clearTimer;
  }, [clearTimer, isActive, logoutDelaySeconds, syncTimeRemaining]);

  const cancelLogout = useCallback(() => {
    clearTimer();
    deadlineRef.current = null;
    hasLoggedOutRef.current = false;
    setTimeRemaining(logoutDelaySeconds);
    setIsExpired(false);
  }, [clearTimer, logoutDelaySeconds]);

  const forceLogout = useCallback(() => {
    clearTimer();
    deadlineRef.current = null;
    handleLogout();
  }, [clearTimer, handleLogout]);

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    cancelLogout,
    forceLogout,
  };
};

export default useAutoLogoutTimer;
