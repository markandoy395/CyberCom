import { startTransition, useEffect, useState } from "react";
import { apiGet, API_ENDPOINTS } from "../../../../utils/api";

const LIVE_MONITOR_POLL_INTERVAL_MS = 1500;

export const useLiveMonitor = ({
  enabled = true,
  competitionId = null,
} = {}) => {
  const [liveParticipants, setLiveParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [integrityMonitorMeta, setIntegrityMonitorMeta] = useState({
    databaseConnected: true,
    unavailableReason: null,
    refreshedAt: null,
  });

  useEffect(() => {
    if (!enabled || !competitionId) {
      setLiveParticipants([]);
      setIsLoading(false);
      setError("");
      setLastUpdatedAt(null);
      setIntegrityMonitorMeta({
        databaseConnected: true,
        unavailableReason: null,
        refreshedAt: null,
      });
      return undefined;
    }

    let disposed = false;

    const loadParticipants = async (isInitialLoad = false) => {
      if (isInitialLoad && !disposed) {
        setIsLoading(true);
      }

      try {
        const response = await apiGet(
          `${API_ENDPOINTS.ADMIN_LIVE_MONITOR_PARTICIPANTS}?competition_id=${competitionId}`,
          {
            cache: "no-store",
          }
        );

        if (disposed) {
          return;
        }

        startTransition(() => {
          setLiveParticipants(Array.isArray(response.data) ? response.data : []);
          setIntegrityMonitorMeta({
            databaseConnected: response.meta?.integrityMonitor?.databaseConnected !== false,
            unavailableReason: response.meta?.integrityMonitor?.unavailableReason || null,
            refreshedAt: response.meta?.integrityMonitor?.refreshedAt || null,
          });
          setError("");
          setLastUpdatedAt(Date.now());
        });
      } catch (loadError) {
        if (disposed) {
          return;
        }

        setError(loadError.message || "Unable to refresh the live monitor right now.");
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    const refreshNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void loadParticipants(false);
    };

    void loadParticipants(true);

    const interval = setInterval(refreshNow, LIVE_MONITOR_POLL_INTERVAL_MS);

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);

    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
    };
  }, [competitionId, enabled]);

  return {
    liveParticipants,
    isLoading,
    error,
    lastUpdatedAt,
    integrityMonitorMeta,
  };
};

export default useLiveMonitor;
