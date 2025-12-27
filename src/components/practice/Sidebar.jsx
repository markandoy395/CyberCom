import { Link } from "react-router-dom";
import { CATEGORIES } from "../../utils/constants";
import ProgressBar from "../common/ProgressBar";
import "./Sidebar.css";

const Sidebar = ({ userData }) => {
  return (
    <aside className="practice-sidebar">
      {/* Recent Attempts */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Recent Attempts</h3>
        <div className="recent-attempts">
          {userData.recentAttempts && userData.recentAttempts.length > 0 ? (
            userData.recentAttempts.map((attempt) => (
              <Link
                key={attempt.id}
                to={`/challenge/${attempt.challengeId}`}
                className="recent-attempt-item"
              >
                <div className="attempt-info">
                  <span className="attempt-name">{attempt.name}</span>
                  <span className="attempt-time">{attempt.timeAgo}</span>
                </div>
                <span className={`status-badge status-${attempt.status}`}>
                  {attempt.status === "solved" ? "✓" : "..."}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-muted sidebar-empty">No recent attempts</p>
          )}
        </div>
      </div>

      {/* Recommended Challenges */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Recommended For You</h3>
        <div className="recommended-challenges">
          {userData.recommendations && userData.recommendations.length > 0 ? (
            userData.recommendations.map((rec) => (
              <Link
                key={rec.id}
                to={`/challenge/${rec.id}`}
                className="recommended-item"
              >
                <div className="rec-icon">{rec.icon}</div>
                <div className="rec-info">
                  <span className="rec-name">{rec.name}</span>
                  <span
                    className={`difficulty-badge difficulty-${rec.difficulty}`}
                  >
                    {rec.difficulty}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted sidebar-empty">
              Complete more challenges to get recommendations
            </p>
          )}
        </div>
      </div>

      {/* Category Progress */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Category Progress</h3>
        <div className="category-progress">
          {CATEGORIES.map((category) => {
            const progress = userData.categoryProgress?.[category.id] || 0;
            return (
              <div key={category.id} className="progress-item">
                <div className="progress-header">
                  <span className="progress-icon">{category.icon}</span>
                  <span className="progress-name">{category.name}</span>
                  <span className="progress-percentage">{progress}%</span>
                </div>
                <ProgressBar progress={progress} color={category.color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Achievement Badges</h3>
        <div className="achievement-badges">
          {userData.badges && userData.badges.length > 0 ? (
            userData.badges.map((badge) => (
              <div
                key={badge.id}
                className={`badge badge-${badge.type}`}
                title={badge.description}
              >
                <span className="badge-icon">{badge.icon}</span>
              </div>
            ))
          ) : (
            <p className="text-muted sidebar-empty">
              Solve challenges to earn badges
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
