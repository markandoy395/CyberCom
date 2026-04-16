import { useCallback, useRef } from "react";
import { apiPost } from "../../../utils/api";

const MIN_ACTIVITY_SYNC_MS = 1000;
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isTabActive = () => document.visibilityState === "visible" && document.hasFocus();

export const useCompetitionLiveMonitor = (session) => {
  const lastSyncAtRef = useRef(0);
  const memberId = session?.memberId || null;
  const teamId = session?.teamId || null;
  const competitionId = session?.competitionId || null;

  const syncActivity = useCallback(async (activity = {}, options = {}) => {
    const { force = false } = options;

    if (!memberId || !teamId || !competitionId) {
      return;
    }

    const currentTime = Date.now();

    if (!force && currentTime - lastSyncAtRef.current < MIN_ACTIVITY_SYNC_MS) {
      return;
    }

    lastSyncAtRef.current = currentTime;

    const tabActive = hasOwn(activity, "isTabActive") ? Boolean(activity.isTabActive) : isTabActive();
    const payload = {
      memberId,
      teamId,
      competitionId,
      isTabActive: tabActive,
    };

    if (hasOwn(activity, "currentChallengeId")) {
      payload.currentChallengeId = activity.currentChallengeId;
      payload.currentChallengeViewedAt = activity.currentChallengeId
        ? new Date().toISOString()
        : null;
    }

    if (hasOwn(activity, "eventChallengeId")) {
      payload.eventChallengeId = activity.eventChallengeId;
    }

    if (hasOwn(activity, "clientEventType")) {
      payload.clientEventType = activity.clientEventType;
      payload.eventOccurredAt = activity.eventOccurredAt || new Date().toISOString();
    }

    if (!tabActive) {
      payload.lastTabBlur = new Date().toISOString();
    }

    try {
      await apiPost("/competition/live-monitor/activity", payload);
    } catch {
      // Keep the competition UI responsive if monitor updates fail.
    }
  }, [competitionId, memberId, teamId]);

  return { syncActivity };
};

export default useCompetitionLiveMonitor;
