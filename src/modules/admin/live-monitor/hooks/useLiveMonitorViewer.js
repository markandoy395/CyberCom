import { useEffect, useMemo, useState } from "react";
import { apiGet, API_ENDPOINTS } from "../../../../utils/api";

const SCREEN_WALL_POLL_INTERVAL_MS = 1500;
const SELECTED_SCREEN_POLL_INTERVAL_MS = 600;
const HISTORY_POLL_INTERVAL_MS = 2000;

const hasSnapshotChanged = (currentSnapshot, nextSnapshot) => (
  currentSnapshot?.lastFrameAt !== nextSnapshot?.lastFrameAt
  || currentSnapshot?.imageDataUrl !== nextSnapshot?.imageDataUrl
  || currentSnapshot?.startedAt !== nextSnapshot?.startedAt
  || currentSnapshot?.width !== nextSnapshot?.width
  || currentSnapshot?.height !== nextSnapshot?.height
);

const haveSnapshotsChanged = (currentSnapshots, nextSnapshots) => {
  const currentKeys = Object.keys(currentSnapshots);
  const nextKeys = Object.keys(nextSnapshots);

  if (currentKeys.length !== nextKeys.length) {
    return true;
  }

  return nextKeys.some(memberId => hasSnapshotChanged(
    currentSnapshots[memberId],
    nextSnapshots[memberId]
  ));
};

export const useLiveMonitorViewer = liveParticipants => {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [screenSnapshotsByMemberId, setScreenSnapshotsByMemberId] = useState({});
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const selectedParticipant = useMemo(
    () => liveParticipants.find(participant => participant.teamMemberId === selectedMemberId) || null,
    [liveParticipants, selectedMemberId]
  );

  const selectedSnapshot = selectedMemberId
    ? (screenSnapshotsByMemberId[selectedMemberId] || null)
    : null;

  useEffect(() => {
    let disposed = false;

    const loadSnapshots = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await apiGet(API_ENDPOINTS.ADMIN_LIVE_MONITOR_SCREEN_SHARES, {
          cache: "no-store",
        });
        const nextSnapshots = Object.fromEntries(
          (Array.isArray(response.data) ? response.data : []).map(snapshot => [
            snapshot.memberId,
            snapshot,
          ])
        );

        if (!disposed) {
          setScreenSnapshotsByMemberId(currentSnapshots => (
            haveSnapshotsChanged(currentSnapshots, nextSnapshots)
              ? nextSnapshots
              : currentSnapshots
          ));
        }
      } catch {
        // Preserve the last successful wall state so previews do not blink away on a transient refresh error.
      }
    };

    void loadSnapshots();

    const interval = window.setInterval(loadSnapshots, SCREEN_WALL_POLL_INTERVAL_MS);
    window.addEventListener("focus", loadSnapshots);
    window.addEventListener("online", loadSnapshots);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadSnapshots);
      window.removeEventListener("online", loadSnapshots);
    };
  }, []);

  useEffect(() => {
    if (!selectedMemberId) {
      return undefined;
    }

    let disposed = false;

    const loadSelectedSnapshot = async () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      try {
        const response = await apiGet(
          API_ENDPOINTS.ADMIN_LIVE_MONITOR_SCREEN_SHARE(selectedMemberId),
          { cache: "no-store" }
        );
        const nextSnapshot = response?.data || null;

        if (!disposed && nextSnapshot) {
          setScreenSnapshotsByMemberId(currentSnapshots => {
            const currentSnapshot = currentSnapshots[selectedMemberId];

            if (
              currentSnapshot?.lastFrameAt === nextSnapshot.lastFrameAt
              && currentSnapshot?.imageDataUrl === nextSnapshot.imageDataUrl
            ) {
              return currentSnapshots;
            }

            return {
              ...currentSnapshots,
              [selectedMemberId]: nextSnapshot,
            };
          });
        }
      } catch (loadError) {
        if (!disposed && (loadError.message || "").includes("API Error [404]")) {
          setScreenSnapshotsByMemberId(currentSnapshots => {
            if (!currentSnapshots[selectedMemberId]) {
              return currentSnapshots;
            }

            const nextSnapshots = { ...currentSnapshots };

            delete nextSnapshots[selectedMemberId];

            return nextSnapshots;
          });
        }
      }
    };

    void loadSelectedSnapshot();

    const interval = window.setInterval(loadSelectedSnapshot, SELECTED_SCREEN_POLL_INTERVAL_MS);
    window.addEventListener("focus", loadSelectedSnapshot);
    window.addEventListener("online", loadSelectedSnapshot);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadSelectedSnapshot);
      window.removeEventListener("online", loadSelectedSnapshot);
    };
  }, [selectedMemberId]);

  useEffect(() => {
    if (!selectedMemberId) {
      setHistoryEntries([]);
      setHistoryError("");
      setHistoryLoading(false);
      return undefined;
    }

    let disposed = false;

    const loadHistory = async isInitialLoad => {
      if (!isInitialLoad && document.visibilityState === "hidden") {
        return;
      }

      if (isInitialLoad) {
        setHistoryLoading(true);
      }

      try {
        const response = await apiGet(
          `${API_ENDPOINTS.ADMIN_LIVE_MONITOR_HISTORY(selectedMemberId)}?limit=100`,
          { cache: "no-store" }
        );

        if (!disposed) {
          setHistoryEntries(Array.isArray(response.data) ? response.data : []);
          setHistoryError("");
        }
      } catch (loadError) {
        if (!disposed) {
          setHistoryError(loadError.message || "Unable to load participant activity.");
        }
      } finally {
        if (!disposed) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory(true);

    const interval = window.setInterval(() => {
      void loadHistory(false);
    }, HISTORY_POLL_INTERVAL_MS);
    const refreshHistory = () => {
      void loadHistory(false);
    };
    window.addEventListener("focus", refreshHistory);
    window.addEventListener("online", refreshHistory);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshHistory);
      window.removeEventListener("online", refreshHistory);
    };
  }, [selectedMemberId]);

  useEffect(() => {
    if (selectedMemberId && !selectedParticipant) {
      setSelectedMemberId(null);
    }
  }, [selectedMemberId, selectedParticipant]);

  const openViewer = participant => {
    setSelectedMemberId(participant.teamMemberId);
    setHistoryEntries([]);
    setHistoryError("");
    setHistoryLoading(true);
  };

  const closeViewer = () => {
    setSelectedMemberId(null);
    setHistoryEntries([]);
    setHistoryError("");
    setHistoryLoading(false);
  };

  return {
    closeViewer,
    historyEntries,
    historyError,
    historyLoading,
    openViewer,
    screenSnapshotsByMemberId,
    selectedParticipant,
    selectedSnapshot,
  };
};

export default useLiveMonitorViewer;
