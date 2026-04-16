import { useState, useCallback, useEffect } from "react";
import { ADMIN_TABS, STORAGE_KEYS } from "../constants/adminConstants";

/**
 * Custom hook to manage modal states
 * Simplifies showing/hiding multiple modals in the admin module
 * @returns {object} Modal state and functions
 */
export const useModalManager = () => {
  const [modals, setModals] = useState({
    createChallenge: false,
    createCompetition: false,
    manageCategories: false,
    competitionSelection: false,
    challengeDetails: false,
    pauseDialog: false,
  });

  const openModal = useCallback((modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals((prev) =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {})
    );
  }, []);

  const toggleModal = useCallback((modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    toggleModal,
  };
};

/**
 * Custom hook to manage competition pause/resume timer
 * @returns {object} Pause timer state and functions
 */
export const useCompetitionPauseTimer = () => {
  const [pauseMinutes, setPauseMinutes] = useState("0");
  const [pauseSeconds, setPauseSeconds] = useState("30");
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const pauseStartTime = localStorage.getItem(STORAGE_KEYS.PAUSE_START_TIME);
      const pauseDurationSeconds = localStorage.getItem(STORAGE_KEYS.PAUSE_DURATION);

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
            setPauseTimeRemaining(`${hours}h ${mins}m ${secs}s`);
          } else {
            setPauseTimeRemaining(`${mins}m ${secs}s`);
          }
        } else {
          setPauseTimeRemaining(null);
        }
      } else {
        setPauseTimeRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const resetPauseForm = useCallback(() => {
    setPauseMinutes("0");
    setPauseSeconds("30");
  }, []);

  return {
    pauseMinutes,
    setPauseMinutes,
    pauseSeconds,
    setPauseSeconds,
    pauseTimeRemaining,
    resetPauseForm,
  };
};

/**
 * Custom hook to manage admin tab navigation
 * @returns {object} Tab state and functions
 */
export const useAdminTabs = (defaultTab = ADMIN_TABS.OVERVIEW) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const switchTab = useCallback((tabName) => {
    setActiveTab(tabName);
  }, []);

  return {
    activeTab,
    setActiveTab,
    switchTab,
  };
};

/**
 * Custom hook to manage selected items (for modals, details, etc.)
 * @returns {object} Selection state and functions
 */
export const useSelection = (initialValue = null) => {
  const [selectedId, setSelectedId] = useState(initialValue);
  const [selectedData, setSelectedData] = useState(null);

  const select = useCallback((id, data = null) => {
    setSelectedId(id);
    setSelectedData(data);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedData(null);
  }, []);

  return {
    selectedId,
    selectedData,
    select,
    clearSelection,
    setSelectedData,
  };
};

