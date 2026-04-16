import React from "react";
import {
  FaStopwatch,
  FaUserGroup,
  FaPuzzlePiece,
  FaArrowTrendUp,
  FaPause,
  FaFlagCheckered,
} from "react-icons/fa6";
import "./CompetitionDashboard.css";

const CompetitionDashboardHeader = ({ competition, formatTime }) => {
  if (!competition) return null;

  const isActive = competition.status === "active";
  const isPaused = competition.status === "paused";

  const statusLabel = isActive ? "Live" : isPaused ? "Paused" : "Ended";
  const statusClass = isActive ? "live" : isPaused ? "paused" : "ended";
  const StatusIcon = isPaused ? FaPause : FaFlagCheckered;
  const totalParticipants = competition.totalParticipants || competition.maxParticipants || 0;
  const currentParticipants = competition.currentParticipants ?? competition.participants ?? 0;

  const isUrgent = competition.timeRemaining < 3600;

  return (
    <div className="competition-dashboard-header">
      <div className="dashboard-title-section">
        <div className="dashboard-info">
          <div className="dashboard-title-row">
            <h2>{competition.name}</h2>
            <span className={`status-pill ${statusClass}`}>
              {isActive ? <span className="pulse-dot" /> : <StatusIcon />}
              {statusLabel}
            </span>
          </div>
          <p className="dashboard-subtitle">{competition.description}</p>
        </div>
      </div>

      <div className="dashboard-metrics-row">
        <div className="metric-card metric-time">
          <div className="metric-icon">
            <FaStopwatch />
          </div>
          <div className="metric-content">
            <span className="metric-label">Time Remaining</span>
            <span
              className={`metric-value ${isUrgent ? "metric-urgent" : ""}`}
            >
              {formatTime(competition.timeRemaining)}
            </span>
          </div>
        </div>

        <div className="metric-card metric-teams">
          <div className="metric-icon">
            <FaUserGroup />
          </div>
          <div className="metric-content">
            <span className="metric-label">Current Participants</span>
            <span className="metric-value">
              {currentParticipants}/{totalParticipants}
            </span>
          </div>
        </div>

        <div className="metric-card metric-challenges">
          <div className="metric-icon">
            <FaPuzzlePiece />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Challenges</span>
            <span className="metric-value">
              {competition.challengeCount || 0}
            </span>
          </div>
        </div>

        <div className="metric-card metric-submissions">
          <div className="metric-icon">
            <FaArrowTrendUp />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Submissions</span>
            <span className="metric-value">
              {competition.submissionCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitionDashboardHeader;
