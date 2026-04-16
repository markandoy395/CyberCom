import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CompetitionTopBar from "../components/layout/CompetitionTopBar";
import CompetitionChallenges from "../components/CompetitionChallenges";
import CompetitionEndedModal from "../components/modals/CompetitionEndedModal";
import CompetitionPausedOverlay from "../components/overlays/CompetitionPausedOverlay";
import { useAutoLogoutTimer } from "../hooks/useAutoLogoutTimer";
import { useCompetitionLiveMonitor, useCompetitionScreenShare } from "../live-monitor";
import {
  apiGet,
  apiPost,
  API_ENDPOINTS,
} from "../../../utils/api";
import "./CompetitionDashboard.css";

const HEARTBEAT_INTERVAL_MS = 20000;
const ACTIVITY_HEARTBEAT_THROTTLE_MS = 15000;
const CHALLENGE_REFRESH_INTERVAL_MS = 3000;
const COMPETITION_ACCESS_REVOKED_ERROR_CODE = "competition_access_revoked";

const defaultCompetitionData = {
  teamName: "",
  teamId: null,
  competitionName: "",
  score: 850,
  solved: 5,
  totalChallenges: 15,
  successRate: 71,
  competitionId: null,
  competitionStatus: null,
  username: "",
};

const CompetitionDashboard = () => {
  const navigate = useNavigate();
  const [competitionSession, setCompetitionSession] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [competitionData, setCompetitionData] = useState(defaultCompetitionData);
  const [isInitializing, setIsInitializing] = useState(true);
  const lastHeartbeatAtRef = useRef(0);
  const accessRevokedRef = useRef(false);
  const autoResumeShareAttemptedRef = useRef(false);
  const memberId = competitionSession?.memberId || null;
  const sessionTeamId = competitionSession?.teamId || null;
  const sessionCompetitionId = competitionSession?.competitionId || null;
  const { syncActivity } = useCompetitionLiveMonitor({
    memberId,
    teamId: sessionTeamId,
    competitionId: sessionCompetitionId,
  });
  const {
    isStarting,
    hasRequiredFullScreenShare,
    isBlocked,
    error: screenShareError,
    clearError: clearScreenShareError,
    startRequiredShare,
    stopSharing,
    clearSession: clearScreenShareSession,
  } = useCompetitionScreenShare(competitionSession);

  const clearCompetitionSession = useCallback(() => {
    localStorage.removeItem("competitionSession");
    setCompetitionSession(null);
  }, []);

  const notifyCompetitionLogout = useCallback(async (options = {}) => {
    const { keepalive = false } = options;
    const storedSession = JSON.parse(localStorage.getItem("competitionSession") || "null");
    const currentSession = competitionSession || storedSession;
    const payload = {
      memberId: currentSession?.memberId || null,
      sessionToken: currentSession?.sessionToken || null,
    };

    if (!payload.memberId && !payload.sessionToken) {
      return;
    }

    const body = JSON.stringify(payload);

    if (keepalive && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(`/api${API_ENDPOINTS.AUTH_LOGOUT_COMPETITION}`, blob);
      return;
    }

    await fetch(`/api${API_ENDPOINTS.AUTH_LOGOUT_COMPETITION}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive,
    });
  }, [competitionSession]);

  const finalizeCompetitionExit = useCallback((options = {}) => {
    const { message = "" } = options;
    clearCompetitionSession();
    clearScreenShareSession();
    navigate("/competition/login", {
      replace: true,
      state: message ? { logoutMessage: message } : null,
    });
  }, [clearCompetitionSession, clearScreenShareSession, navigate]);

  const handleCompetitionAccessRevoked = useCallback(async (
    message = "You were disqualified for violating the competition rules. You cannot log in again."
  ) => {
    if (accessRevokedRef.current) {
      return;
    }

    accessRevokedRef.current = true;

    try {
      await stopSharing({
        notifyServer: false,
        preserveSession: false,
        reason: "access-revoked",
      });
      await notifyCompetitionLogout();
    } catch (error) {
      console.error("Error during forced competition logout:", error);
    } finally {
      finalizeCompetitionExit({ message });
    }
  }, [finalizeCompetitionExit, notifyCompetitionLogout, stopSharing]);

  const handleAutoLogout = useCallback(async () => {
    try {
      await stopSharing({
        reason: "auto-logout",
        preserveSession: false,
      });
      await notifyCompetitionLogout();
    } catch (error) {
      console.error("Error during automatic competition logout:", error);
    } finally {
      finalizeCompetitionExit();
    }
  }, [finalizeCompetitionExit, notifyCompetitionLogout, stopSharing]);

  const { timeRemaining, formattedTime, cancelLogout, forceLogout } = useAutoLogoutTimer(
    competitionData.competitionStatus === "done",
    10,
    handleAutoLogout
  );

  const confirmMemberOnline = useCallback(async (nextMemberId, options = {}) => {
    const {
      force = false,
      teamId: nextTeamId = null,
      competitionId: nextCompetitionId = null,
      isTabActive = document.visibilityState === "visible" && document.hasFocus(),
    } = options;

    if (!nextMemberId) {
      return;
    }

    const now = Date.now();

    if (!force && now - lastHeartbeatAtRef.current < 5000) {
      return;
    }

    lastHeartbeatAtRef.current = now;

    try {
      await apiPost("/teams/heartbeat", {
        memberId: parseInt(nextMemberId, 10),
        teamId: nextTeamId,
        competitionId: nextCompetitionId,
        isTabActive,
      });
    } catch (error) {
      if (error?.data?.errorCode === COMPETITION_ACCESS_REVOKED_ERROR_CODE) {
        void handleCompetitionAccessRevoked(error.data?.error || error.message);
        return;
      }

      console.error("Error refreshing competition presence:", error);
    }
  }, [handleCompetitionAccessRevoked]);

  const setupHeartbeat = useCallback((nextMemberId, nextTeamId, nextCompetitionId) => {
    if (!nextMemberId || !nextTeamId || !nextCompetitionId) {
      return undefined;
    }

    const sendHeartbeat = () => {
      void confirmMemberOnline(nextMemberId, {
        force: true,
        teamId: nextTeamId,
        competitionId: nextCompetitionId,
        isTabActive: document.visibilityState === "visible" && document.hasFocus(),
      });
    };
    const handleActivity = () => {
      if (Date.now() - lastHeartbeatAtRef.current >= ACTIVITY_HEARTBEAT_THROTTLE_MS) {
        sendHeartbeat();
      }
    };
    const handleVisibilityChange = () => {
      sendHeartbeat();
    };
    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];

    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener("focus", sendHeartbeat);
    window.addEventListener("blur", sendHeartbeat);
    window.addEventListener("online", sendHeartbeat);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      activityEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("focus", sendHeartbeat);
      window.removeEventListener("blur", sendHeartbeat);
      window.removeEventListener("online", sendHeartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [confirmMemberOnline]);

  const fetchCompetitionChallenges = useCallback(async (competitionId, teamId = null) => {
    try {
      const queryString = teamId ? `?team_id=${teamId}` : "";
      const data = await apiGet(`/competitions/${competitionId}/challenges${queryString}`);

      if (data.success && Array.isArray(data.data)) {
        // Deduplicate challenges by ID to prevent repeating display in scroll
        const uniqueChallenges = Array.from(
          new Map(data.data.map(challenge => [challenge.id, challenge])).values()
        );
        setChallenges(uniqueChallenges);
      }
    } catch {
      // Keep the dashboard usable even if this refresh fails.
    }
  }, []);

  const fetchCompetitionDetails = useCallback(async competitionId => {
    try {
      const data = await apiGet(`/competitions/${competitionId}`);

      if (data.success && data.data) {
        const nextCompetitionStatus = data.data.status || null;
        const nextCompetitionName = data.data.name || "";

        setCompetitionData(current => ({
          ...current,
          competitionName: nextCompetitionName,
          competitionStatus: nextCompetitionStatus,
        }));
        setCompetitionSession(current => {
          if (!current) {
            return current;
          }

          if (
            current.competitionStatus === nextCompetitionStatus
            && current.competitionName === nextCompetitionName
          ) {
            return current;
          }

          const nextSession = {
            ...current,
            competitionStatus: nextCompetitionStatus,
            competitionName: nextCompetitionName,
          };

          localStorage.setItem("competitionSession", JSON.stringify(nextSession));

          return nextSession;
        });
      }
    } catch {
      // Keep the dashboard usable even if this refresh fails.
    }
  }, []);

  useEffect(() => {
    const handleAccessRevokedEvent = event => {
      void handleCompetitionAccessRevoked(
        event?.detail?.message
          || "You were disqualified for violating the competition rules. You cannot log in again."
      );
    };

    window.addEventListener("competition-access-revoked", handleAccessRevokedEvent);

    return () => {
      window.removeEventListener("competition-access-revoked", handleAccessRevokedEvent);
    };
  }, [handleCompetitionAccessRevoked]);

  useEffect(() => {
    const storedSession = localStorage.getItem("competitionSession");

    if (!storedSession) {
      setIsInitializing(false);
      navigate("/competition/login", { replace: true });
      return undefined;
    }

    try {
      const parsed = JSON.parse(storedSession);

      if (!parsed?.memberId || !parsed?.teamId || !parsed?.competitionId || !parsed?.sessionToken) {
        throw new Error("Invalid competition session");
      }

      setCompetitionSession(parsed);
      setCompetitionData(current => ({
        ...current,
        teamName: parsed.teamName,
        teamId: parsed.teamId,
        competitionId: parsed.competitionId,
        competitionStatus: parsed.competitionStatus || null,
        username: parsed.username,
      }));

      if (parsed.competitionId) {
        void fetchCompetitionDetails(parsed.competitionId);
        void fetchCompetitionChallenges(parsed.competitionId, parsed.teamId);
      }

      setIsInitializing(false);
      return undefined;
    } catch {
      clearCompetitionSession();
      setIsInitializing(false);
      navigate("/competition/login", { replace: true });
      return undefined;
    }
  }, [
    clearCompetitionSession,
    fetchCompetitionChallenges,
    fetchCompetitionDetails,
    navigate,
  ]);

  useEffect(() => {
    if (!memberId || !sessionTeamId || !sessionCompetitionId) {
      return undefined;
    }

    void confirmMemberOnline(memberId, {
      force: true,
      teamId: sessionTeamId,
      competitionId: sessionCompetitionId,
    });

    return setupHeartbeat(
      memberId,
      sessionTeamId,
      sessionCompetitionId
    );
  }, [
    confirmMemberOnline,
    memberId,
    sessionCompetitionId,
    sessionTeamId,
    setupHeartbeat,
  ]);

  const activeChallengeId = hasRequiredFullScreenShare ? (selectedChallenge?.id || null) : null;

  useEffect(() => {
    if (!memberId || !sessionTeamId || !sessionCompetitionId) {
      return;
    }

    void syncActivity(
      {
        currentChallengeId: activeChallengeId,
        isTabActive: document.visibilityState === "visible" && document.hasFocus(),
      },
      { force: true }
    );
  }, [
    activeChallengeId,
    memberId,
    sessionCompetitionId,
    sessionTeamId,
    syncActivity,
  ]);

  useEffect(() => {
    if (!memberId || !sessionTeamId || !sessionCompetitionId) {
      return undefined;
    }

    const getCurrentChallengeId = () => selectedChallenge?.id || null;
    const emitClientEvent = (clientEventType, options = {}) => {
      void syncActivity(
        {
          clientEventType,
          eventOccurredAt: new Date().toISOString(),
          eventChallengeId: getCurrentChallengeId(),
          ...(options.isTabActive === undefined
            ? {}
            : { isTabActive: options.isTabActive }),
        },
        { force: true }
      );
    };
    const handleWindowBlur = () => {
      emitClientEvent("window_blur", { isTabActive: false });
    };
    const handleWindowFocus = () => {
      emitClientEvent("window_focus", {
        isTabActive: document.visibilityState === "visible" && document.hasFocus(),
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        emitClientEvent("tab_hidden", { isTabActive: false });
        return;
      }

      emitClientEvent("tab_visible", {
        isTabActive: document.visibilityState === "visible" && document.hasFocus(),
      });
    };
    const handleCopy = () => {
      emitClientEvent("copy");
    };
    const handlePaste = () => {
      emitClientEvent("paste");
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [
    memberId,
    selectedChallenge,
    sessionCompetitionId,
    sessionTeamId,
    syncActivity,
  ]);

  useEffect(() => {
    if (!competitionSession) {
      autoResumeShareAttemptedRef.current = false;
      return;
    }

    if (competitionData.competitionStatus === "done") {
      return;
    }

    if (
      autoResumeShareAttemptedRef.current
      || isStarting
      || hasRequiredFullScreenShare
    ) {
      return;
    }

    autoResumeShareAttemptedRef.current = true;
    clearScreenShareError();
    void startRequiredShare(competitionSession);
  }, [
    clearScreenShareError,
    competitionData.competitionStatus,
    competitionSession,
    hasRequiredFullScreenShare,
    isStarting,
    startRequiredShare,
  ]);

  useEffect(() => {
    if (!competitionData.competitionId) {
      return undefined;
    }

    const refreshChallenges = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void fetchCompetitionChallenges(
        competitionData.competitionId,
        competitionData.teamId
      );
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshChallenges();
      }
    };

    refreshChallenges();

    const interval = setInterval(refreshChallenges, CHALLENGE_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshChallenges);
    window.addEventListener("online", refreshChallenges);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshChallenges);
      window.removeEventListener("online", refreshChallenges);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    competitionData.competitionId,
    competitionData.teamId,
    fetchCompetitionChallenges,
  ]);

  useEffect(() => {
    const pollCompetitionStatus = async () => {
      try {
        if (competitionData.competitionId && competitionData.competitionStatus !== "done") {
          await fetchCompetitionDetails(competitionData.competitionId);
        }
      } catch {
        // Keep polling quietly in the background.
      }
    };

    const pollInterval = setInterval(pollCompetitionStatus, 5000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    competitionData.competitionId,
    competitionData.competitionStatus,
    fetchCompetitionDetails,
  ]);

  const handleExitCompetition = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to exit the competition? Your progress will be saved."
      )
    ) {
      return;
    }

    try {
      await stopSharing({
        reason: "participant-exit",
        preserveSession: false,
      });
      await notifyCompetitionLogout();
    } catch (error) {
      console.error("Error updating offline status:", error);
    } finally {
      finalizeCompetitionExit();
    }
  }, [finalizeCompetitionExit, notifyCompetitionLogout, stopSharing]);

  const handleResumeRequiredShare = useCallback(async () => {
    if (!competitionSession) {
      return;
    }

    clearScreenShareError();
    await startRequiredShare(competitionSession);
  }, [clearScreenShareError, competitionSession, startRequiredShare]);

  const handleChallengeSelection = challenge => {
    setSelectedChallenge(challenge);
  };

  const handleContinueViewing = () => {
    cancelLogout();
  };

  const handleLogoutNow = () => {
    forceLogout();
  };

  if (isInitializing) {
    return (
      <div className="competition-dashboard competition-dashboard-loading-shell">
        <div className="competition-dashboard-loading">
          Loading competition session...
        </div>
      </div>
    );
  }

  const isCompetitionPaused = competitionData.competitionStatus === "paused";
  const isCompetitionDone = competitionData.competitionStatus === "done";

  return (
    <div className="competition-dashboard">
      <CompetitionTopBar
        data={competitionData}
        onExit={handleExitCompetition}
        isSystemLocked={!hasRequiredFullScreenShare || isCompetitionPaused}
      />

      <div className="competition-content">
        {!isCompetitionPaused && !isCompetitionDone && isBlocked ? (
          <div className="competition-access-blocker">
            <div className="competition-access-card">
              <span className="competition-access-kicker">Access paused</span>
              <h2>Full-screen sharing must stay active</h2>
              <p>
                The competition workspace is locked until your entire screen is shared again.
                Resume full-screen sharing to continue, or exit the competition session.
              </p>
              {screenShareError && (
                <div className="competition-access-error">{screenShareError}</div>
              )}
              <div className="competition-access-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleResumeRequiredShare}
                  disabled={isStarting || !competitionSession}
                >
                  {isStarting ? "Waiting for browser..." : "Resume Full-Screen Sharing"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleExitCompetition}
                >
                  Exit Competition
                </button>
              </div>
            </div>
          </div>
        ) : (
          <CompetitionChallenges
            selectedChallenge={selectedChallenge}
            onSelectChallenge={handleChallengeSelection}
            challenges={challenges}
            competitionStatus={competitionData.competitionStatus}
          />
        )}
      </div>

      {isCompetitionPaused && <CompetitionPausedOverlay />}

      {isCompetitionDone && (
        <CompetitionEndedModal
          competitionName={competitionData.competitionName}
          timeRemaining={timeRemaining}
          formattedTime={formattedTime}
          totalTimeout={10}
          onContinueViewing={handleContinueViewing}
          onLogoutNow={handleLogoutNow}
        />
      )}
    </div>
  );
};

export default CompetitionDashboard;
