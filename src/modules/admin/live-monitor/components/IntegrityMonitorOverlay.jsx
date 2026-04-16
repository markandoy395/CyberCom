import { useDeferredValue, useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { FiFilter, FiSearch, FiShield, FiX } from "react-icons/fi";
import ParticipantIntegrityCard from "./ParticipantIntegrityCard";

const RISK_FILTERS = [
  { key: "all", label: "All" },
  { key: "high-risk", label: "High Risk" },
  { key: "monitor", label: "Monitor" },
  { key: "watch", label: "Watch" },
  { key: "normal", label: "Normal" },
];

const IntegrityMonitorOverlay = ({
  liveParticipants = [],
  integrityMonitorMeta = null,
  onOpenViewer,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const participants = useMemo(
    () => (Array.isArray(liveParticipants) ? liveParticipants : []),
    [liveParticipants]
  );
  const deferredParticipants = useDeferredValue(participants);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredParticipants = useMemo(() => {
    let result = [...deferredParticipants];

    if (riskFilter !== "all") {
      result = result.filter(
        participant => participant.riskAssessment?.statusKey === riskFilter
      );
    }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();

        result = result.filter(participant => {
          const primaryChallengeTitle = participant.riskAssessment?.primaryChallenge?.title || "";
          const topChallengeTitles = Array.isArray(participant.riskAssessment?.topChallenges)
            ? participant.riskAssessment.topChallenges
              .map(challenge => challenge.title || "")
              .join(" ")
            : "";
          const currentChallenge = participant.currentChallenge || "";

          return (
            participant.username?.toLowerCase().includes(query)
            || participant.teamName?.toLowerCase().includes(query)
            || currentChallenge.toLowerCase().includes(query)
            || primaryChallengeTitle.toLowerCase().includes(query)
            || topChallengeTitles.toLowerCase().includes(query)
          );
        });
      }

    result.sort((left, right) => (
      Number(right.riskAssessment?.monitorRecommended)
      - Number(left.riskAssessment?.monitorRecommended)
    ) || (
      (right.riskAssessment?.score || 0) - (left.riskAssessment?.score || 0)
    ));

    return result;
  }, [deferredParticipants, riskFilter, searchQuery]);

  const totalCount = participants.length;
  const highRiskCount = participants.filter(
    participant => participant.riskAssessment?.statusKey === "high-risk"
  ).length;
  const monitorCount = participants.filter(
    participant => participant.riskAssessment?.monitorRecommended
  ).length;
  const databaseConnected = integrityMonitorMeta?.databaseConnected !== false;
  const databaseStatusMessage = databaseConnected
    ? "Database sync active. Integrity scores are refreshed from persistent audit tables."
    : integrityMonitorMeta?.unavailableReason === "missing_tables"
      ? "Database sync unavailable. Run backend-node/scripts/add-participant-monitoring.sql and restart the backend."
      : "Database sync is temporarily unavailable. Integrity scores may not reflect the latest audit rows.";

  const overlayContent = (
    <div className="integrity-overlay" onClick={onClose}>
      <div
        className="integrity-overlay-container"
        onClick={event => event.stopPropagation()}
      >
        <div className="integrity-overlay-header">
          <div className="integrity-overlay-title-block">
            <div className="integrity-overlay-title-row">
              <FiShield size={22} />
              <h2 className="integrity-overlay-title">Integrity Monitor</h2>
            </div>
            <p className="integrity-overlay-subtitle">
              Single-challenge audit analysis for solve speed, attempts, focus changes,
              and clipboard activity.
            </p>
          </div>
          <div className="integrity-overlay-header-right">
            <div className="integrity-overlay-stats">
              <span className="integrity-stat-pill total">{totalCount} Total</span>
              <span className="integrity-stat-pill high-risk">
                {highRiskCount} High Risk
              </span>
              <span className="integrity-stat-pill monitor">
                {monitorCount} Recommended
              </span>
            </div>
            <button
              type="button"
              className="integrity-overlay-close"
              onClick={onClose}
              aria-label="Close Integrity Monitor"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="integrity-overlay-body">
          <div className="integrity-overlay-controls">
            <div className="integrity-search-box">
              <FiSearch size={15} />
              <input
                type="text"
                placeholder="Search by participant, team, or challenge"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="integrity-search-input"
              />
            </div>
            <div className="integrity-filter-group">
              <FiFilter size={14} />
              {RISK_FILTERS.map(filter => (
                <button
                  key={filter.key}
                  type="button"
                  className={`integrity-filter-pill ${
                    riskFilter === filter.key ? "active" : ""
                  }`}
                  onClick={() => setRiskFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`integrity-database-banner ${databaseConnected ? "connected" : "warning"}`}>
            <FiShield size={14} />
            <span>{databaseStatusMessage}</span>
          </div>

          {filteredParticipants.length > 0 ? (
            <div className="integrity-overlay-grid">
              {filteredParticipants.map(participant => (
                <ParticipantIntegrityCard
                  key={participant.teamMemberId || participant.id}
                  participant={participant}
                  onOpenViewer={onOpenViewer}
                />
              ))}
            </div>
          ) : (
            <div className="integrity-overlay-empty">
              <FiShield size={40} />
              <h3>No Participants Found</h3>
              <p>
                {searchQuery || riskFilter !== "all"
                  ? "Try adjusting the search or risk filter."
                  : "No live competition participants are available yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlayContent, document.body);
};

export default IntegrityMonitorOverlay;
