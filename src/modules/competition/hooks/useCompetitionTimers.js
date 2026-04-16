import { useState, useEffect, useRef, useCallback } from 'react';

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
};

export const useCompetitionTimer = (initialTime = 1000000) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isCompetitionFinished, setIsCompetitionFinished] = useState(false);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsCompetitionFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isCompetitionFinished,
  };
};

export const usePauseStatus = () => {
  const [isCompetitionPaused, setIsCompetitionPaused] = useState(false);
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(null);
  const previousPauseStatusRef = useRef(null);

  const getPauseTimeRemaining = useCallback(() => {
    const pauseStartTime = localStorage.getItem("competitionPauseStartTime");
    const pauseDurationSeconds = localStorage.getItem("competitionPauseDuration");

    if (pauseStartTime && pauseDurationSeconds) {
      const now = Date.now();
      const startTime = parseInt(pauseStartTime);
      const durationMs = parseInt(pauseDurationSeconds) * 1000;
      const remainingMs = durationMs - (now - startTime);

      if (remainingMs > 0) {
        const remainingSecs = Math.ceil(remainingMs / 1000);
        const hours = Math.floor(remainingSecs / 3600);
        const mins = Math.floor((remainingSecs % 3600) / 60);
        const secs = remainingSecs % 60;
        
        if (hours > 0) {
          return `${hours}h ${mins}m ${secs}s`;
        } else {
          return `${mins}m ${secs}s`;
        }
      }
    }
    return null;
  }, []);

  // Check for pause status from admin
  useEffect(() => {
    const checkPauseStatus = () => {
      const pausedStatus = localStorage.getItem("competitionPaused");
      const isPaused = pausedStatus === "true";
      
      // Only update state if value actually changed
      if (previousPauseStatusRef.current !== isPaused) {
        previousPauseStatusRef.current = isPaused;
        setIsCompetitionPaused(isPaused);
      }
    };

    checkPauseStatus();
    const interval = setInterval(checkPauseStatus, 500);

    return () => clearInterval(interval);
  }, []);

  // Update pause display timer
  useEffect(() => {
    if (!isCompetitionPaused) return;

    const pauseTimerInterval = setInterval(() => {
      setPauseTimeRemaining(getPauseTimeRemaining());
    }, 1000);

    return () => clearInterval(pauseTimerInterval);
  }, [isCompetitionPaused, getPauseTimeRemaining]);

  return {
    isCompetitionPaused,
    pauseTimeRemaining,
  };
};
