import { memo, useMemo, useState } from "react";
import { FaSatelliteDish, FaUsersViewfinder, FaShieldHalved } from "react-icons/fa6";
import {
  ActivitySummary,
  ChallengeViewer,
  IntegrityMonitorOverlay,
  LiveLeaderboard,
  LiveMonitorScreenViewerModal,
  ScreenWall,
  formatLastUpdated,
  useLiveMonitorViewer,
} from "../../../live-monitor";

const LiveMonitorTab = ({
  liveParticipants,
  isLoading = false,
  error = "",
  lastUpdatedAt = null,
  integrityMonitorMeta = null,
  selectedCompetition = null,
}) => {
  const [showIntegrityMonitor, setShowIntegrityMonitor] = useState(false);

  const hasParticipants = liveParticipants.length > 0;
  const hasChallengeViewer = useMemo(
    () => liveParticipants.some(participant => participant.viewingChallengeData),
    [liveParticipants]
  );

  const {
    closeViewer,
    historyEntries,
    historyError,
    historyLoading,
    openViewer,
    screenSnapshotsByMemberId,
    selectedParticipant,
    selectedSnapshot,
  } = useLiveMonitorViewer(liveParticipants);

  const handleOpenIntegrityViewer = participant => {
    setShowIntegrityMonitor(false);
    openViewer(participant);
  };

  if (!selectedCompetition) {
    return (
      <div className="admin-section live-monitor-section">
        <div className="no-participants-message">
          <div className="no-participants-icon"><FaUsersViewfinder size={24} /></div>
          <h3>No Competition Available</h3>
          <p>Create or select a competition to open the live monitor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section live-monitor-section">
      <div className="section-header">
        <h3><FaSatelliteDish size={20} /> Live Competition Monitor</h3>
        <div className="monitor-stats">
          <button
            type="button"
            className="integrity-monitor-trigger"
            onClick={() => setShowIntegrityMonitor(true)}
          >
            <FaShieldHalved size={14} />
            Integrity Monitor
          </button>
          <span className="live-indicator">LIVE</span>
          <span className="participant-count">
            {selectedCompetition.name} | {liveParticipants.length} Active Participants
          </span>
        </div>
      </div>

      {(isLoading || error || lastUpdatedAt) && (
        <div className={`live-monitor-status ${error ? "warning" : ""}`}>
          <span>
            {isLoading && !lastUpdatedAt
              ? "Loading live monitor..."
              : `Last update: ${formatLastUpdated(lastUpdatedAt)}`}
          </span>
          {error && (
            <span className="live-monitor-status-detail">
              Live data refresh had a temporary issue. Showing the last successful monitor state.
            </span>
          )}
        </div>
      )}

      {hasParticipants ? (
        <>
          <ActivitySummary liveParticipants={liveParticipants} />
          <ScreenWall
            liveParticipants={liveParticipants}
            snapshotsByMemberId={screenSnapshotsByMemberId}
            onOpenViewer={openViewer}
          />
          <LiveLeaderboard liveParticipants={liveParticipants} />
          {hasChallengeViewer && (
            <ChallengeViewer liveParticipants={liveParticipants} />
          )}
        </>
      ) : (
        <div className="no-participants-message">
          <div className="no-participants-icon"><FaUsersViewfinder size={24} /></div>
          <h3>{isLoading ? "Loading Live Monitor" : "No Active Participants"}</h3>
          <p>
            {isLoading
              ? "Fetching the latest participant activity..."
              : "Waiting for participants to join the competition..."}
          </p>
        </div>
      )}

      <LiveMonitorScreenViewerModal
        participant={selectedParticipant}
        snapshot={selectedSnapshot}
        history={historyEntries}
        historyLoading={historyLoading}
        historyError={historyError}
        onClose={closeViewer}
      />

      {showIntegrityMonitor && (
        <IntegrityMonitorOverlay
          liveParticipants={liveParticipants}
          integrityMonitorMeta={integrityMonitorMeta}
          onOpenViewer={handleOpenIntegrityViewer}
          onClose={() => setShowIntegrityMonitor(false)}
        />
      )}
    </div>
  );
};

export default memo(LiveMonitorTab);
