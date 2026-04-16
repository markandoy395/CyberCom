import { useEffect, useState } from "react";
import CompetitionScreenShareManager from "./CompetitionScreenShareManager";

export const useCompetitionScreenShare = (session = null) => {
  const [screenShareState, setScreenShareState] = useState(() =>
    CompetitionScreenShareManager.getState()
  );

  useEffect(() => {
    const unsubscribe = CompetitionScreenShareManager.subscribe(setScreenShareState);

    setScreenShareState(CompetitionScreenShareManager.getState());

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (session?.sessionToken) {
      CompetitionScreenShareManager.setSession(session);
    }
  }, [session]);

  return {
    ...screenShareState,
    clearError: () => CompetitionScreenShareManager.clearError(),
    startRequiredShare: sessionOverride =>
      CompetitionScreenShareManager.startRequiredShare(sessionOverride || session),
    stopSharing: options => CompetitionScreenShareManager.stopSharing(options),
    clearSession: () => CompetitionScreenShareManager.clearSession(),
  };
};

export default useCompetitionScreenShare;
