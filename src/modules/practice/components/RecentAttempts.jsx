import { Link } from "react-router-dom";
import { BiCheck, BiDotsHorizontalRounded, FaClock } from "../../../utils/icons";
import "./RecentAttempts.css";

const RecentAttempts = ({ recentAttempts = [] }) => {
  return (
    <div className="recent-attempts-container">
      <div className="recent-attempts-header">
        <h3 className="recent-attempts-title">
          <FaClock className="title-icon" />
          Recent Attempts
        </h3>
      </div>
      {recentAttempts && recentAttempts.length > 0 ? (
        <div className="recent-attempts-list">
          {recentAttempts.map((attempt) => (
            <Link
              key={attempt.id}
              to={`/challenge/${attempt.challengeId}`}
              className={`attempt-item attempt-${attempt.status}`}
            >
              <div className="attempt-icon">
                {attempt.status === "solved" ? (
                  <BiCheck className="icon-solved" />
                ) : attempt.status === "in_progress" ? (
                  <FaClock className="icon-progress" />
                ) : (
                  <BiDotsHorizontalRounded className="icon-unsolved" />
                )}
              </div>
              <div className="attempt-details">
                <span className="attempt-name">{attempt.name}</span>
                <span className="attempt-time">{attempt.timeAgo}</span>
              </div>
              <span className={`attempt-status attempt-status-${attempt.status}`}>
                {attempt.status === "solved" ? "Solved" : attempt.status === "in_progress" ? "In Progress" : "Unsolved"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted empty-state">No recent attempts</p>
      )}
    </div>
  );
};

export default RecentAttempts;
