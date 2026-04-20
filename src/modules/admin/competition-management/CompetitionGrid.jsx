import {
  FaBan,
  FaCalendarDays,
  FaCirclePlay,
  FaCircleInfo,
  FaFlagCheckered,
  FaPause,
  FaRocket,
  FaShieldHalved,
  FaStopwatch,
  FaTrophy,
  FaUserGroup,
} from "react-icons/fa6";
import { COMPETITION_STATUS } from "../constants";

const CompetitionCard = ({
  competition,
  formatTime,
  hasActiveCompetition,
  onCancelCompetition,
  onDoneCompetition,
  onOpenChecklist,
  onPauseCompetition,
  onStartCompetition,
  pauseTimeRemaining,
  startValidationsByCompetitionId,
  startingCompetitionId,
  validationMessages,
}) => {
  const isUpcoming = competition.status === COMPETITION_STATUS.UPCOMING;
  const isPaused = competition.status === COMPETITION_STATUS.PAUSED;
  const totalParticipants = competition.totalParticipants || competition.maxParticipants || 0;
  const currentParticipants = competition.currentParticipants ?? competition.participants ?? 0;
  const timeLabel = isUpcoming ? "Starts In" : "Time Remaining";
  const timeValue = isUpcoming
    ? (competition.timeRemaining > 0 ? formatTime(competition.timeRemaining) : "Ready to start")
    : (competition.timeRemaining > 0 ? formatTime(competition.timeRemaining) : "Ended");
  const dateLabel = isUpcoming ? "Start Date" : "End Date";
  const dateValue = isUpcoming ? competition.startDate : competition.endDate;
  const validationState = startValidationsByCompetitionId[competition.id] || null;
  const isValidationLoading = isUpcoming && (!validationState || validationState.loading);
  const isStarting = startingCompetitionId === competition.id;
  const startTitle = hasActiveCompetition
    ? validationMessages.ACTIVE_COMPETITION_MESSAGE
    : isValidationLoading
      ? validationMessages.VALIDATION_LOADING_MESSAGE
      : validationState?.error
        ? validationMessages.VALIDATION_ERROR_MESSAGE
        : validationState?.validation?.startReady
          ? "Start competition"
          : validationMessages.START_BLOCKED_MESSAGE;

  return (
    <div
      className={`competition-card ${isPaused ? "paused" : ""} ${isUpcoming ? "upcoming" : ""}`}
    >
      {isPaused && (
        <div className="paused-overlay">
          <div className="paused-message">
            <div className="paused-icon"><FaPause style={{ fontSize: "48px" }} /></div>
            <h2>PAUSED</h2>
            <p>
              {pauseTimeRemaining
                ? `${pauseTimeRemaining} remaining`
                : "Competition paused"}
            </p>
          </div>
        </div>
      )}

      <div className="comp-card-header">
        <div className="comp-card-title">
          <h4>{competition.name}</h4>
          <span
            className={`status-badge status-${competition.status}`}
            title={competition.status}
          >
            {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
          </span>
        </div>
      </div>

      {competition.description && (
        <p className="comp-description">
          {competition.description}
        </p>
      )}

      <div className="comp-card-grid">
        <div className="comp-info-item">
          <span className="comp-info-icon"><FaUserGroup /></span>
          <div className="comp-info-text">
            <span className="comp-info-label">Participants</span>
            <span className="comp-info-value">
              {currentParticipants}/{totalParticipants}
            </span>
          </div>
        </div>

        <div className="comp-info-item">
          <span className="comp-info-icon"><FaStopwatch /></span>
          <div className="comp-info-text">
            <span className="comp-info-label">{timeLabel}</span>
            <span className="comp-info-value">{timeValue}</span>
          </div>
        </div>

        {dateValue && (
          <div className="comp-info-item">
            <span className="comp-info-icon"><FaCalendarDays /></span>
            <div className="comp-info-text">
              <span className="comp-info-label">{dateLabel}</span>
              <span className="comp-info-value">
                {new Date(dateValue).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {isUpcoming && (
        <div className={`comp-readiness ${validationState?.validation?.startReady ? "ready" : "blocked"}`}>
          <span className="comp-readiness-label">
            <span>Start Readiness</span>
            <span
              aria-label="Make sure to complete the required Pre-Competition Validation items to start the competition"
              className="comp-readiness-help"
              role="img"
              tabIndex={0}
            >
              <FaCircleInfo aria-hidden="true" />
              <span className="comp-readiness-tooltip" role="tooltip">
                Make sure to complete the required Pre-Competition Validation items to start the competition
              </span>
            </span>
          </span>
          <span className="comp-readiness-value">
            {isValidationLoading
              ? "Checking checklist..."
              : validationState?.error
                ? "Validation unavailable"
                : validationState?.validation
                  ? `${validationState.validation.passedCount}/${validationState.validation.totalCount} checks passed`
                  : "Checklist pending"}
          </span>
        </div>
      )}

      <div className="comp-actions">
        <button
          className="btn-small btn-secondary"
          onClick={() => onOpenChecklist(competition)}
          title="Review Pre-Competition Validation"
          type="button"
        >
          <FaShieldHalved />
          Validation
        </button>

        {isUpcoming ? (
          <>
            <button
              className="btn-small btn-primary"
              disabled={isStarting || isValidationLoading}
              onClick={() => void onStartCompetition(competition)}
              title={startTitle}
              type="button"
            >
              <FaRocket />
              {isStarting ? "Starting..." : isValidationLoading ? "Checking..." : "Start Competition"}
            </button>
            <button
              className="btn-small btn-danger"
              onClick={() => onCancelCompetition(competition.id)}
              title="Cancel Competition"
              type="button"
            >
              <FaBan />
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className={`btn-small ${isPaused ? "btn-success" : "btn-warning"}`}
              onClick={() => onPauseCompetition(competition.id)}
              title={isPaused ? "Resume Competition" : "Pause Competition"}
              type="button"
            >
              {isPaused ? <FaCirclePlay /> : <FaPause />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              className="btn-small btn-success"
              onClick={() => onDoneCompetition(competition.id)}
              title="Mark as Done"
              type="button"
            >
              <FaFlagCheckered />
              Done
            </button>
            <button
              className="btn-small btn-danger"
              onClick={() => onCancelCompetition(competition.id)}
              title="Cancel Competition"
              type="button"
            >
              <FaBan />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const CompetitionGrid = props => {
  const { manageableCompetitions } = props;

  const priorityOrder = ['active', 'paused', 'upcoming'];
  const sorted = [...manageableCompetitions].sort(
    (a, b) => priorityOrder.indexOf(a.status) - priorityOrder.indexOf(b.status)
  );
  const displayCompetition = sorted[0] || null;

  if (!displayCompetition) {
    return (
      <div className="empty-state">
        <FaTrophy />
        <h4>No Competitions</h4>
        <p>No upcoming, active, or paused competitions. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="competition-grid">
      <CompetitionCard
        key={displayCompetition.id}
        competition={displayCompetition}
        {...props}
      />
    </div>
  );
};

export default CompetitionGrid;
