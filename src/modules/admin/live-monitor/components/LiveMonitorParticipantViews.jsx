import { FiMonitor } from "react-icons/fi";

export const ChallengeViewer = ({ liveParticipants }) => (
  <div className="challenge-viewer-section">
    <h3><FiMonitor size={20} /> Live Challenge Viewer</h3>
    <div className="challenge-screens-grid">
      {liveParticipants
        .filter(participant => participant.viewingChallengeData)
        .map(participant => (
          <div key={participant.id} className="challenge-screen">
            <div className="screen-header">
              <div className="screen-user">
                <span className="screen-avatar">{participant.username[0]}</span>
                <span className="screen-username">{participant.username}</span>
              </div>
              <span className={`screen-status-badge ${participant.status}`}>
                {participant.status === "solving" ? "Solving" : "Idle"}
              </span>
            </div>
            <div className="screen-content">
              <div className="screen-section">
                <h4 className="screen-title">{participant.viewingChallengeData.title}</h4>
                <div className="screen-meta">
                  <span className="meta-badge category">{participant.viewingChallengeData.category}</span>
                  <span className={`meta-badge difficulty difficulty-${participant.viewingChallengeData.difficulty}`}>
                    {participant.viewingChallengeData.difficulty}
                  </span>
                  <span className="meta-badge points">
                    {participant.viewingChallengeData.points} pts
                  </span>
                </div>
              </div>
              <div className="screen-section">
                <h5 className="section-subtitle">Description</h5>
                <p className="description-preview">
                  {participant.viewingChallengeData.description?.substring(0, 150) || "No description available"}
                  {participant.viewingChallengeData.description?.length > 150 ? "..." : ""}
                </p>
              </div>
              {participant.viewingChallengeData.hints?.length > 0 && (
                <div className="screen-section">
                  <h5 className="section-subtitle">
                    Available Hints ({participant.viewingChallengeData.hints.length})
                  </h5>
                  <div className="hints-list">
                    {participant.viewingChallengeData.hints.slice(0, 2).map((hint, index) => (
                      <div key={`${participant.id}-hint-${index}`} className="hint-item">
                        <span className="hint-number">Hint {index + 1}:</span>
                        <span className="hint-text">{hint.substring(0, 80)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="screen-footer">
                <span className="view-time">
                  Viewing since: {new Date(participant.viewingChallengeData.viewedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
    </div>
  </div>
);
