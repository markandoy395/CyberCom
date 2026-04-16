import { useState } from "react";
import ReactDOM from "react-dom";
import {
  FiAlertTriangle,
  FiClock,
  FiList,
  FiLoader,
  FiMonitor,
  FiSearch,
  FiX,
} from "react-icons/fi";
import {
  formatHistoryTime,
  formatSnapshotTime,
  getSnapshotAspectRatio,
} from "../utils/liveMonitorUtils";

const ActivityHistoryPanel = ({ history, loading, error }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSeverity, setFilteredSeverity] = useState("all");

  const filteredHistory = history.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase())
      || (entry.description && entry.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSeverity = filteredSeverity === "all" || entry.severity === filteredSeverity;

    return matchesSearch && matchesSeverity;
  });

  return (
    <aside className="screen-viewer-history">
      <div className="screen-viewer-history-header">
        <h3>Activity History</h3>
        <span>{filteredHistory.length} events</span>
      </div>

      <div className="activity-search-container">
        <div className="activity-search-input">
          <FiSearch size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="activity-search-field"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <div className="activity-filter-buttons">
          <button
            type="button"
            className={`filter-btn ${filteredSeverity === "all" ? "active" : ""}`}
            onClick={() => setFilteredSeverity("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-btn ${filteredSeverity === "success" ? "active" : ""}`}
            onClick={() => setFilteredSeverity("success")}
          >
            Success
          </button>
          <button
            type="button"
            className={`filter-btn ${filteredSeverity === "warning" ? "active" : ""}`}
            onClick={() => setFilteredSeverity("warning")}
          >
            Warnings
          </button>
          <button
            type="button"
            className={`filter-btn ${filteredSeverity === "info" ? "active" : ""}`}
            onClick={() => setFilteredSeverity("info")}
          >
            Info
          </button>
        </div>
      </div>

      {error && (
        <div className="screen-viewer-message error">
          <FiAlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}
      {!error && loading && history.length === 0 && (
        <div className="screen-viewer-message">
          <FiLoader size={18} className="spin" />
          <span>Loading participant activity...</span>
        </div>
      )}
      {!error && !loading && history.length === 0 && (
        <div className="screen-viewer-message">
          <FiList size={18} />
          <span>No recorded activity yet for this participant.</span>
        </div>
      )}
      {filteredHistory.length === 0 && history.length > 0 && (
        <div className="screen-viewer-message">
          <FiSearch size={18} />
          <span>No activities match your search or filter.</span>
        </div>
      )}
      {filteredHistory.length > 0 && (
        <div className="screen-viewer-history-list">
          {filteredHistory.map(entry => (
            <article
              key={entry.id}
              className={`screen-history-item severity-${entry.severity || "info"}`}
            >
              <div className="screen-history-item-header">
                <strong>{entry.title}</strong>
                <span>{formatHistoryTime(entry.occurredAt)}</span>
              </div>
              {entry.description && <p>{entry.description}</p>}
            </article>
          ))}
        </div>
      )}
    </aside>
  );
};

const ScreenViewerModal = ({
  participant,
  snapshot,
  history,
  historyLoading,
  historyError,
  onClose,
}) => {
  if (!participant) {
    return null;
  }

  const handleBackdropClick = event => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div className="screen-viewer-overlay" onClick={handleBackdropClick}>
      <div className="screen-viewer-modal">
        <div className="screen-viewer-header">
          <div>
            <h2>Live Screen Viewer</h2>
            <p className="screen-viewer-subtitle">
              {participant.username} - {participant.teamName}
            </p>
          </div>
          <button type="button" className="screen-viewer-close" onClick={onClose} title="Close modal">
            <FiX size={24} />
          </button>
        </div>
        <div className="screen-viewer-body">
          <div className="screen-viewer-meta-row">
            {participant.riskAssessment && (
              <>
                <span className={`screen-viewer-pill ${
                  participant.riskAssessment.statusKey === "high-risk" ? "pill-danger"
                  : participant.riskAssessment.statusKey === "monitor" || participant.riskAssessment.statusKey === "watch" ? "pill-warning"
                  : "pill-success"
                }`}>
                  Risk {participant.riskAssessment.statusLabel}
                </span>
                <span className="screen-viewer-pill pill-purple">
                  Score {participant.riskAssessment.score}
                </span>
                <span className={`screen-viewer-pill ${
                  participant.riskAssessment.monitorRecommended ? "pill-warning" : "pill-success"
                }`}>
                  {participant.riskAssessment.monitorRecommended
                    ? "Recommendation: Monitor"
                    : "Recommendation: Normal"}
                </span>
              </>
            )}
            <span className={`screen-viewer-pill ${
              participant.isScreenSharing ? "pill-success" : "pill-danger"
            }`}>
              <FiMonitor size={14} />
              {participant.isScreenSharing ? "Live preview active" : "Preview offline"}
            </span>
            <span className="screen-viewer-pill pill-neutral">
              Last frame {formatSnapshotTime(snapshot?.lastFrameAt)}
            </span>
            {snapshot?.startedAt && (
              <span className="screen-viewer-pill pill-neutral">
                Started {formatSnapshotTime(snapshot.startedAt)}
              </span>
            )}
          </div>

          <div className="screen-viewer-layout">
            <section className="screen-viewer-main">
              {snapshot?.imageDataUrl ? (
                <div
                  className="screen-viewer-frame"
                  style={{ "--snapshot-aspect-ratio": getSnapshotAspectRatio(snapshot) }}
                >
                  <img
                    src={snapshot.imageDataUrl}
                    alt={`Live screen preview for ${participant.username}`}
                  />
                </div>
              ) : (
                <div className="screen-viewer-message">
                  {participant.isScreenSharing ? <FiClock size={24} /> : <FiMonitor size={24} />}
                  <span>
                    {participant.isScreenSharing
                      ? "Waiting for the participant's next frame..."
                      : "This participant is not currently sharing their screen."}
                  </span>
                </div>
              )}
            </section>

            <ActivityHistoryPanel
              history={history}
              loading={historyLoading}
              error={historyError}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ScreenViewerModal;
