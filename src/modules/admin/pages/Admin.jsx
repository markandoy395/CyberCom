import { useEffect, useState, useCallback, useMemo } from "react";
import { FaCompress, FaExpand, FaSpinner } from "react-icons/fa6";
import AdminSidebar from "../components/AdminSidebar";
import NotificationModal from "../../../common/NotificationModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import CompetitionDataTablesModal from "../components/modals/CompetitionDataTablesModal";
import { apiGet, apiPut, API_ENDPOINTS } from "../../../utils/api";
import {
  useModalManager,
  useAdminTabs,
  useCompetitionPauseTimer,
  useSelection,
  useLiveMonitor,
} from "../hooks";
import { ADMIN_TABS, COMPETITION_STATUS, STORAGE_KEYS } from "../constants";
import {
  OverviewTab,
  PracticeChallengesTab,
  CompetitionChallengesTab,
  UsersTab,
  CompetitionsTab,
  RankingsTab,
  LiveMonitorTab,
  RulesTab,
  PracticeRulesTab,
  SelectChallengesTab,
  OverallRankingTab,
  ScoringSimulatorTab,
} from "./tabs";
import { PauseDialog } from "../components";
import CompetitionCreateModal from "../components/modals/CompetitionCreateModal";
import "./Admin.css";

const DEFAULT_OVERVIEW_STATS = {
  cards: {
    totalUsers: 0,
    activeChallenges: 0,
    activeCompetitions: 0,
    totalSubmissions: 0,
  },
  categories: {
    competition: [],
    practice: [],
  },
};

const getApiErrorMessage = error => (
  error?.message || "Unknown error."
).replace(/^API Error \[\d+\] [^:]+: /, "");

const normalizeCompetitionStatus = status => {
  const normalizedStatus = typeof status === "string"
    ? status.trim().toLowerCase()
    : "";

  return Object.values(COMPETITION_STATUS).includes(normalizedStatus)
    ? normalizedStatus
    : COMPETITION_STATUS.UPCOMING;
};
const getCategoryAcronym = (categoryName) => {
  const acronyms = {
    "Web Exploitation": "WEB",
    "Cryptography": "CRYPT",
    "Forensics": "FOREN",
    "Reverse Engineering": "REV",
    "Binary Exploitation": "BIN",
  };
  return acronyms[categoryName] || categoryName;
};

const normalizeCategoryStats = categoryStats => (
  Array.isArray(categoryStats)
    ? categoryStats.map(category => ({
      id: Number(category.id) || null,
      name: getCategoryAcronym(category.name) || "Unknown",
      challenges: Number(category.challenges) || 0,
      solves: Number(category.solves) || 0,
    }))
    : []
);
const normalizeOverviewStats = stats => ({
  cards: {
    totalPracticeUsers: Number(stats?.cards?.totalPracticeUsers) || 0,
    activeChallenges: Number(stats?.cards?.activeChallenges) || 0,
    activeCompetitions: Number(stats?.cards?.activeCompetitions) || 0,
    totalSubmissions: Number(stats?.cards?.totalSubmissions) || 0,
    totalCompetitions: Number(stats?.cards?.totalCompetitions) || 0,
    totalCompetitionParticipants: Number(stats?.cards?.totalCompetitionParticipants) || 0,
  },
  categories: {
    competition: normalizeCategoryStats(stats?.categories?.competition),
    practice: normalizeCategoryStats(stats?.categories?.practice),
  },
});
const mapCompetitionSummary = comp => {
  const normalizedStatus = normalizeCompetitionStatus(comp.status);
  const startDate = new Date(comp.start_date);
  const endDate = new Date(comp.end_date);
  const now = new Date();
  const secondsUntilStart = Number.isNaN(startDate.getTime())
    ? 0
    : Math.max(0, Math.floor((startDate - now) / 1000));
  const secondsUntilEnd = Number.isNaN(endDate.getTime())
    ? 0
    : Math.max(0, Math.floor((endDate - now) / 1000));
  const timeRemaining = normalizedStatus === COMPETITION_STATUS.UPCOMING
    ? secondsUntilStart
    : secondsUntilEnd;
  const maxParticipants = Number(comp.max_participants) || 8;
  const totalParticipants = Number(comp.total_member_count) || maxParticipants;
  const currentParticipants = Number(comp.online_member_count) || 0;

  return {
    id: comp.id,
    name: comp.name,
    status: normalizedStatus,
    rawStatus: comp.status,
    participants: currentParticipants,
    currentParticipants,
    totalParticipants,
    teamCount: Number(comp.team_count) || 0,
    team_count: Number(comp.team_count) || 0,
    total_member_count: totalParticipants,
    online_member_count: currentParticipants,
    startDate: comp.start_date,
    endDate: comp.end_date,
    start_date: comp.start_date,
    end_date: comp.end_date,
    timeRemaining,
    secondsUntilStart,
    secondsUntilEnd,
    description: comp.description || "",
    maxParticipants,
    challengeCount: Number(comp.challenge_count) || 0,
    challenge_count: Number(comp.challenge_count) || 0,
    scoring_settings: comp.scoring_settings || null,
  };
};
const normalizeOptionalId = value => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
};
const isManageableCompetition = competition => {
  const status = normalizeCompetitionStatus(competition?.status);

  return status !== COMPETITION_STATUS.DONE
    && status !== COMPETITION_STATUS.CANCELLED;
};
const getPreferredCompetitionId = (selectedId, competitions) => {
  const normalizedSelectedId = normalizeOptionalId(selectedId);
  const scopedCompetitions = competitions.filter(isManageableCompetition);
  const availableCompetitions = scopedCompetitions.length > 0
    ? scopedCompetitions
    : competitions;

  if (
    normalizedSelectedId
    && availableCompetitions.some(
      competition => normalizeOptionalId(competition?.id) === normalizedSelectedId
    )
  ) {
    return normalizedSelectedId;
  }

  const activeCompetition = availableCompetitions.find(
    competition => normalizeCompetitionStatus(competition?.status) === COMPETITION_STATUS.ACTIVE
  );

  return normalizeOptionalId(activeCompetition?.id)
    || normalizeOptionalId(availableCompetitions[0]?.id);
};

export const Admin = () => {
  const { activeTab, switchTab } = useAdminTabs(ADMIN_TABS.OVERVIEW);
  const { modals, openModal, closeModal } = useModalManager();
  const { pauseMinutes, setPauseMinutes, pauseSeconds, setPauseSeconds, pauseTimeRemaining, resetPauseForm } =
    useCompetitionPauseTimer();
  const { selectedId: selectedCompId, select: selectCompetition } = useSelection();

  const [isCompetitionFullscreen, setIsCompetitionFullscreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [rankingType, setRankingType] = useState("individual");
  const [competitions, setCompetitions] = useState([]);
  const [overviewStats, setOverviewStats] = useState(DEFAULT_OVERVIEW_STATS);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedTableType, setSelectedTableType] = useState(null);
  const [selectedTableCompetitionId, setSelectedTableCompetitionId] = useState(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    severity: 'warning',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    isLoading: false,
  });
  const hasManageableCompetitions = competitions.some(
    competition => isManageableCompetition(competition)
  );
  const resolvedCompetitionId = useMemo(
    () => getPreferredCompetitionId(selectedCompId, competitions),
    [competitions, selectedCompId]
  );
  const selectedCompetition = useMemo(
    () => competitions.find(
      competition => normalizeOptionalId(competition.id) === resolvedCompetitionId
    ) || null,
    [competitions, resolvedCompetitionId]
  );
  const liveMonitor = useLiveMonitor({
    enabled: activeTab === "liveMonitor" && Boolean(resolvedCompetitionId),
    competitionId: resolvedCompetitionId,
  });

  useEffect(() => {
    document.body.classList.add("admin-module-active");

    return () => {
      document.body.classList.remove("admin-module-active");
    };
  }, []);

  const loadCompetitions = useCallback(async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.COMPETITIONS_LIST);

      if (res.success && Array.isArray(res.data)) {
        setCompetitions(res.data.map(mapCompetitionSummary));
      }
    } catch {
      // Error handled silently
    }
  }, []);
  const loadOverviewStats = useCallback(async () => {
    try {
      const res = await apiGet(API_ENDPOINTS.ADMIN_STATS);

      if (res.success && res.data) {
        setOverviewStats(normalizeOverviewStats(res.data));
      }
    } catch {
      // Error handled silently
    }
  }, []);
  const refreshAdminDashboard = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setIsInitialLoading(true);
    }

    try {
      await Promise.all([
        loadCompetitions(),
        loadOverviewStats(),
      ]);
    } finally {
      if (showLoader) {
        setIsInitialLoading(false);
      }
    }
  }, [loadCompetitions, loadOverviewStats]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void refreshAdminDashboard();
    };

    void refreshAdminDashboard({ showLoader: true });

    const pollInterval = setInterval(() => {
      refreshIfVisible();
    }, 5000);

    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
    };
  }, [refreshAdminDashboard]);

  const formatTime = useCallback((seconds) => {
    if (!seconds) return "0s";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }, []);

  const showAdminResult = useCallback((success, message) => {
    setNotification({
      type: success ? 'success' : 'error',
      title: success ? 'Success' : 'Error',
      message,
    });
  }, []);
  const clearPauseStorage = useCallback(() => {
    localStorage.removeItem("competitionPaused");
    localStorage.removeItem("competitionPausedId");
    localStorage.removeItem(STORAGE_KEYS.PAUSE_START_TIME);
    localStorage.removeItem(STORAGE_KEYS.PAUSE_DURATION);
  }, []);
  const persistPauseStorage = useCallback((competitionId, totalSeconds) => {
    const now = Date.now();

    localStorage.setItem("competitionPaused", "true");
    localStorage.setItem(STORAGE_KEYS.PAUSE_START_TIME, String(now));
    localStorage.setItem(STORAGE_KEYS.PAUSE_DURATION, String(totalSeconds));
    localStorage.setItem("competitionPausedId", String(competitionId));
  }, []);

  const handleOpenTableModal = useCallback((tableType, competitionId = null) => {
    setSelectedTableType(tableType);
    setSelectedTableCompetitionId(normalizeOptionalId(competitionId));
    setShowTableModal(true);
  }, []);

  const handleCloseTableModal = useCallback(() => {
    setShowTableModal(false);
    setSelectedTableType(null);
    setSelectedTableCompetitionId(null);
  }, []);

  const customOpenModal = useCallback((modalType) => {
    const tableModalTypes = [
      "viewCompetitionTables",
      "viewPracticeUsers",
      "viewCompetitionsTable",
      "viewTeamsTable",
      "viewMembersTable",
      "viewChallengesTable",
      "viewCategoriesTable",
      "viewSubmissionsTable",
      "viewRulesTable",
      "viewTeamRankingsTable",
      "viewMemberRankingsTable",
      "viewLoginHistory",
      "viewLiveMonitorTable",
    ];

    if (tableModalTypes.includes(modalType)) {
      const tableTypeMap = {
        viewCompetitionTables: { tableType: "data-center", competitionId: resolvedCompetitionId },
        viewPracticeUsers: { tableType: "practice-users", competitionId: resolvedCompetitionId },
        viewCompetitionsTable: { tableType: "competitions", competitionId: resolvedCompetitionId },
        viewTeamsTable: { tableType: "teams", competitionId: resolvedCompetitionId },
        viewMembersTable: { tableType: "members", competitionId: resolvedCompetitionId },
        viewChallengesTable: { tableType: "challenges", competitionId: resolvedCompetitionId },
        viewCategoriesTable: { tableType: "categories", competitionId: resolvedCompetitionId },
        viewSubmissionsTable: { tableType: "submissions", competitionId: resolvedCompetitionId },
        viewRulesTable: { tableType: "rules", competitionId: resolvedCompetitionId },
        viewTeamRankingsTable: { tableType: "team-rankings", competitionId: resolvedCompetitionId },
        viewMemberRankingsTable: { tableType: "member-rankings", competitionId: resolvedCompetitionId },
        viewLoginHistory: { tableType: "history", competitionId: resolvedCompetitionId },
        viewLiveMonitorTable: { tableType: "live-monitor", competitionId: resolvedCompetitionId },
      };
      const tableConfig = tableTypeMap[modalType];

      handleOpenTableModal(tableConfig.tableType, tableConfig.competitionId);
    } else {
      openModal(modalType);
    }
  }, [openModal, handleOpenTableModal, resolvedCompetitionId]);

  async function confirmStartCompetition(compId) {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      await apiPut(API_ENDPOINTS.COMPETITIONS_UPDATE(compId), {
        status: COMPETITION_STATUS.ACTIVE,
      });
      setCompetitions(prev =>
        prev.map(comp => (
          comp.id === compId
            ? { ...comp, status: COMPETITION_STATUS.ACTIVE }
            : comp
        ))
      );
      await refreshAdminDashboard();
      showAdminResult(true, "Competition started. Participants can now log in.");
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      return true;
    } catch (error) {
      showAdminResult(false, getApiErrorMessage(error));
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      return false;
    }
  }

  const handleStartCompetition = async (compId) => {
    const competition = competitions.find(comp => comp.id === compId);

    if (!competition) {
      showAdminResult(false, "Competition not found.");
      return false;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Start Competition',
      message: `Start "${competition.name}" now? Participants will be able to log in immediately.`,
      severity: 'info',
      confirmText: 'Start',
      cancelText: 'Cancel',
      isLoading: false,
      onConfirm: () => {
        void confirmStartCompetition(compId);
      },
    });
    return true;
  };

  const handlePauseCompetition = useCallback(async (compId) => {
    const comp = competitions.find((c) => c.id === compId);
    const isPaused = comp?.status === COMPETITION_STATUS.PAUSED;

    if (!comp) {
      showAdminResult(false, "Competition not found.");
      return;
    }

    if (isPaused) {
      try {
        await apiPut(API_ENDPOINTS.COMPETITIONS_UPDATE(compId), {
          status: COMPETITION_STATUS.ACTIVE,
        });

        clearPauseStorage();
        await refreshAdminDashboard();
        showAdminResult(true, "Competition resumed.");
      } catch (error) {
        showAdminResult(false, getApiErrorMessage(error));
      }
    } else {
      selectCompetition(compId);
      openModal("pauseDialog");
    }
  }, [
    clearPauseStorage,
    competitions,
    openModal,
    refreshAdminDashboard,
    selectCompetition,
    showAdminResult,
  ]);

  const handleConfirmPause = useCallback(async () => {
    if (!selectedCompId) {
      return;
    }

    const totalSeconds = parseInt(pauseMinutes || 0) * 60 + parseInt(pauseSeconds || 0);

    if (totalSeconds <= 0) {
      showAdminResult(false, "Pause duration must be greater than zero.");
      return;
    }

    try {
      await apiPut(API_ENDPOINTS.COMPETITIONS_UPDATE(selectedCompId), {
        status: COMPETITION_STATUS.PAUSED,
      });

      persistPauseStorage(selectedCompId, totalSeconds);
      closeModal("pauseDialog");
      resetPauseForm();
      await refreshAdminDashboard();
      showAdminResult(true, "Competition paused.");
    } catch (error) {
      showAdminResult(false, getApiErrorMessage(error));
    }
  }, [
    closeModal,
    pauseMinutes,
    pauseSeconds,
    persistPauseStorage,
    refreshAdminDashboard,
    resetPauseForm,
    selectedCompId,
    showAdminResult,
  ]);

  async function confirmCancelCompetition(compId) {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      await apiPut(API_ENDPOINTS.COMPETITIONS_UPDATE(compId), {
        status: COMPETITION_STATUS.CANCELLED,
      });
      setCompetitions(prev =>
        prev.map(comp => {
          if (comp.id === compId) {
            clearPauseStorage();
          }

          return comp.id === compId
            ? { ...comp, status: COMPETITION_STATUS.CANCELLED }
            : comp;
        })
      );
      await refreshAdminDashboard();
      showAdminResult(true, "Competition cancelled.");
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      showAdminResult(false, getApiErrorMessage(error));
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  }

  const handleCancelCompetition = async (compId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Competition',
      message: 'Cancel this competition? This action cannot be undone.',
      severity: 'danger',
      confirmText: 'Cancel Competition',
      cancelText: 'Keep It',
      isLoading: false,
      onConfirm: () => {
        void confirmCancelCompetition(compId);
      },
    });
  };

  async function confirmDoneCompetition(compId) {
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const res = await apiPut(API_ENDPOINTS.COMPETITIONS_UPDATE(compId), { status: "done" });
      setCompetitions((prev) =>
        prev.map((comp) => {
          if (comp.id === compId) {
            clearPauseStorage();
          }
          return comp.id === compId ? { ...comp, status: "done" } : comp;
        })
      );
      await refreshAdminDashboard();
      setNotification({
        type: res.success ? 'success' : 'error',
        title: res.success ? 'Success' : 'Error',
        message: res.success ? "Competition marked as done!" : "Error: " + (res.error || "Unknown"),
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: getApiErrorMessage(error),
      });
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  }

  const handleDoneCompetition = async (compId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Finalize Competition',
      message: 'Mark competition as done? This will finalize all results and cannot be undone.',
      severity: 'warning',
      confirmText: 'Mark as Done',
      cancelText: 'Keep Active',
      isLoading: false,
      onConfirm: () => {
        void confirmDoneCompetition(compId);
      },
    });
  };

  return (
    <div
      className={`admin-layout ${isCompetitionFullscreen ? "admin-layout--fullscreen" : ""} ${
        isSidebarCollapsed ? "admin-layout--sidebar-collapsed" : "admin-layout--sidebar-expanded"
      }`}
    >
      <AdminSidebar 
        activeTab={activeTab} onTabChange={switchTab} isFullscreen={isCompetitionFullscreen} 
        hasManageableCompetitions={hasManageableCompetitions} isModalOpen={false} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={setIsSidebarCollapsed}
      />
      <div className="admin-dashboard">
      <NotificationModal notification={notification} onDismiss={() => setNotification(null)} duration={3000} />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        severity={confirmModal.severity}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

        <div className="admin-header">
          <h1 className="admin-title">Admin Control Panel</h1>
          {[ADMIN_TABS.COMPETITIONS, "competition-challenges", "scoring-simulator", "rankings", "rules"].includes(activeTab) && (
            <div className="admin-header-right">
              <button
                className="btn-icon btn-secondary"
                title={isCompetitionFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                onClick={() => setIsCompetitionFullscreen(!isCompetitionFullscreen)}
              >
                {isCompetitionFullscreen ? <FaCompress /> : <FaExpand />}
              </button>
            </div>
          )}
        </div>

        <div className="admin-content">
          {isInitialLoading ? (
            <div className="admin-loading-state" role="status" aria-live="polite">
              <div className="admin-loading-panel">
                <FaSpinner className="admin-loading-spinner" />
                <h2>Loading admin dashboard</h2>
                <p>Refreshing competitions, overview stats, and monitoring data...</p>
              </div>
            </div>
          ) : (
            <div key={activeTab} className="admin-content-animated">
              {activeTab === ADMIN_TABS.OVERVIEW && (
                <OverviewTab
                  competitions={competitions}
                  openModal={customOpenModal}
                  switchTab={switchTab}
                  formatTime={formatTime}
                  overviewStats={overviewStats}
                />
              )}
              {activeTab === ADMIN_TABS.CHALLENGES && <PracticeChallengesTab />}
              {activeTab === ADMIN_TABS.SCORING_SIMULATOR && (
                <ScoringSimulatorTab
                  competitions={competitions}
                  selectedCompId={resolvedCompetitionId}
                  onSelectCompetition={selectCompetition}
                />
              )}
              {activeTab === "competition-challenges" && <CompetitionChallengesTab />}
              {activeTab === "team-accounts" && (
                <UsersTab
                  competitions={competitions}
                  selectedCompId={resolvedCompetitionId}
                />
              )}
              {(activeTab === "competitions-dashboard" || activeTab === "competitions") && (
                <CompetitionsTab competitions={competitions}
                  handleStartCompetition={handleStartCompetition}
                  handlePauseCompetition={handlePauseCompetition} handleDoneCompetition={handleDoneCompetition}
                  handleCancelCompetition={handleCancelCompetition} formatTime={formatTime}
                  pauseTimeRemaining={pauseTimeRemaining} openModal={openModal} showResult={showAdminResult} />
              )}
              {activeTab === "rankings" && (
                <RankingsTab
                  rankingType={rankingType}
                  setRankingType={setRankingType}
                  competitions={competitions}
                  selectedCompId={resolvedCompetitionId}
                />
              )}
              {activeTab === "liveMonitor" && (
                <LiveMonitorTab
                  liveParticipants={liveMonitor.liveParticipants}
                  isLoading={liveMonitor.isLoading}
                  error={liveMonitor.error}
                  lastUpdatedAt={liveMonitor.lastUpdatedAt}
                  integrityMonitorMeta={liveMonitor.integrityMonitorMeta}
                  selectedCompetition={selectedCompetition}
                />
              )}
              {activeTab === "rules" && <RulesTab />}
              {activeTab === "practiceRules" && <PracticeRulesTab />}
              {activeTab === "overallCompetitionRankings" && (
                <OverallRankingTab type="competition" />
              )}
              {activeTab === "overallPracticeRankings" && (
                <OverallRankingTab type="practice" />
              )}
              {activeTab === "select-challenges" && (
                <SelectChallengesTab
                  competitions={competitions}
                  selectedCompId={resolvedCompetitionId}
                />
              )}
            </div>
          )}
        </div>

        {modals.pauseDialog && (
          <PauseDialog
            closeModal={closeModal}
            pauseMinutes={pauseMinutes}
            setPauseMinutes={setPauseMinutes}
            pauseSeconds={pauseSeconds}
            setPauseSeconds={setPauseSeconds}
            handleConfirmPause={handleConfirmPause}
          />
        )}

        {modals.createCompetition && (
          <CompetitionCreateModal
            closeModal={closeModal}
            onCompetitionCreated={() => {
              void refreshAdminDashboard();
              showAdminResult(true, "Competition created successfully! Complete the checklist, then start it when ready.");
            }}
          />
        )}

        {showTableModal && (
          <CompetitionDataTablesModal
            isOpen={showTableModal}
            onClose={handleCloseTableModal}
            competitions={competitions}
            onSelectTable={handleOpenTableModal}
            selectedCompetitionId={selectedTableCompetitionId}
            tableType={selectedTableType}
          />
        )}

      </div>
    </div>
  );
};

export default Admin;
