import { FiAlertTriangle, FiCircle, FiClock, FiMonitor, FiSmartphone } from "react-icons/fi";
import { formatSnapshotTime, getSnapshotAspectRatio } from "../utils/liveMonitorUtils";

export const ActivitySummary = ({ liveParticipants }) => (
  <div className="activity-summary">
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiCircle size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">Focused</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => participant.isTabActive).length}
        </span>
      </div>
    </div>
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiCircle size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">Away</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => !participant.isTabActive).length}
        </span>
      </div>
    </div>
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiSmartphone size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">Viewing Challenge</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => participant.viewingChallengeData).length}
        </span>
      </div>
    </div>
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiMonitor size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">Full Screen Shared</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => participant.isFullScreenSharing || participant.isScreenSharing).length}
        </span>
      </div>
    </div>
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiAlertTriangle size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">Monitor</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => participant.riskAssessment?.monitorRecommended).length}
        </span>
      </div>
    </div>
    <div className="activity-stat">
      <span className="activity-stat-icon"><FiAlertTriangle size={18} /></span>
      <div className="activity-stat-info">
        <span className="activity-stat-label">High Risk</span>
        <span className="activity-stat-value">
          {liveParticipants.filter(participant => participant.riskAssessment?.statusKey === "high-risk").length}
        </span>
      </div>
    </div>
  </div>
);

export const ScreenWall = ({ liveParticipants, snapshotsByMemberId, onOpenViewer }) => (
  <div className="monitor-screen-wall">
    <div className="monitor-screen-wall-header">
      <div>
        <h4>Live Screen Wall</h4>
        <p>Click any participant preview to inspect it in detail.</p>
      </div>
      <span className="monitor-screen-wall-count">
        {liveParticipants.filter(participant => participant.isScreenSharing).length} live feeds
      </span>
    </div>
    <div className="monitor-screen-grid">
      {liveParticipants.map(participant => {
        const snapshot = snapshotsByMemberId[participant.teamMemberId] || null;
        const canOpen = Boolean(participant.isScreenSharing);

        return (
          <button
            key={participant.teamMemberId}
            type="button"
            className={`monitor-screen-card ${canOpen ? "live" : "offline"}`}
            disabled={!canOpen}
            onClick={() => onOpenViewer(participant)}
          >
            <div className="monitor-screen-card-header">
              <div>
                <h5>{participant.username}</h5>
                <p>{participant.teamName}</p>
              </div>
              <span className={`monitor-screen-status ${canOpen ? "live" : "offline"}`}>
                {canOpen ? "LIVE" : "OFFLINE"}
              </span>
            </div>
            <div
              className="monitor-screen-preview"
              style={{ "--snapshot-aspect-ratio": getSnapshotAspectRatio(snapshot) }}
            >
              {snapshot?.imageDataUrl ? (
                <img
                  src={snapshot.imageDataUrl}
                  alt={`Live preview for ${participant.username}`}
                />
              ) : (
                <div className="monitor-screen-placeholder">
                  {canOpen ? <FiClock size={20} /> : <FiMonitor size={20} />}
                  <span>
                    {canOpen ? "Waiting for the next frame" : "Participant is not sharing"}
                  </span>
                </div>
              )}
            </div>
            <div className="monitor-screen-card-footer">
              <span>{participant.currentChallenge || "Browsing challenges"}</span>
              <span>{formatSnapshotTime(snapshot?.lastFrameAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export const LiveLeaderboard = ({ liveParticipants }) => (
  <div className="monitor-leaderboard">
    <h3>Live Leaderboard</h3>
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Score</th>
          <th>Challenges</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {[...liveParticipants]
          .sort((left, right) => right.score - left.score)
          .map((participant, index) => (
            <tr key={participant.id}>
              <td className="rank-cell">
                {index < 3 ? `Top ${index + 1}` : `#${index + 1}`}
              </td>
              <td className="username-cell">{participant.username}</td>
              <td className="score-cell">{participant.score}</td>
              <td className="solves-cell">{participant.solves}</td>
              <td className={`status-badge ${participant.status}`}>
                <span className="status-icon">*</span>
                {participant.status === "solving" ? "Solving" : "Idle"}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);
