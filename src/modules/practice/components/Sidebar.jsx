import { Link } from "react-router-dom";
import { createElement, useState, useRef, useEffect } from "react";
import { CATEGORIES } from "../../../utils/constants";
import { getIconComponent } from "../../../utils/helpers";
import "./Sidebar.css";
import {
  BiCheck,
  BiDotsHorizontalRounded,
  FaArrowLeftLong,
  FaArrowRightLong,
  FaBarsProgress,
  GrAchievement,
  GoClockFill,
} from "../../../utils/icons.js";

const Sidebar = ({ userData, isCollapsed, onToggle }) => {
  const [focusedSection, setFocusedSection] = useState(null);
  const [hoveredBadge, setHoveredBadge] = useState(null);
  const attemptsRef = useRef(null);
  const progressRef = useRef(null);
  const badgesRef = useRef(null);

  useEffect(() => {
    if (focusedSection === "attempts" && attemptsRef.current) {
      attemptsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (focusedSection === "progress" && progressRef.current) {
      progressRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (focusedSection === "badges" && badgesRef.current) {
      badgesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusedSection, isCollapsed]);

  // Calculate badge progress
  const badgeProgress = userData.badgeProgress || {
    "first-blood": { current: 0, total: 1, description: "Solve 1 challenge first" },
    "speed-demon": { current: 0, total: 5, description: "Solve 5 challenges under 5 min" },
    "category-master": { current: 0, total: 6, description: "Master all categories" },
  };

  if (isCollapsed) {
    return (
      <aside className="practice-sidebar practice-sidebar-collapsed">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title="Expand sidebar"
        >
          <FaArrowLeftLong />
        </button>
        <div
          className="sidebar-icon-group"
          title="Recent Attempts"
          onClick={() => {
            setFocusedSection("attempts");
            onToggle();
          }}
        >
          <div className="sidebar-icon">
            <GoClockFill />
          </div>
        </div>
        <div
          className="sidebar-icon-group"
          title="Category Progress"
          onClick={() => {
            setFocusedSection("progress");
            onToggle();
          }}
        >
          <div className="sidebar-icon">
            <FaBarsProgress />
          </div>
        </div>
        <div
          className="sidebar-icon-group"
          title="Achievement Badges"
          onClick={() => {
            setFocusedSection("badges");
            onToggle();
          }}
        >
          <div className="sidebar-icon">
            <GrAchievement />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="practice-sidebar">
      {/* Recent Attempts */}
      <div
        ref={attemptsRef}
        className={`sidebar-section ${
          focusedSection === "attempts" ? "focused" : ""
        }`}
      >
        <button
          className="sidebar-toggle-btn sidebar-toggle-expanded"
          onClick={() => {
            onToggle();
            setFocusedSection(null);
          }}
          title="Collapse sidebar"
        >
          <FaArrowRightLong />
        </button>
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
                  {attempt.status === "solved" ? (
                    <BiCheck />
                  ) : (
                    <BiDotsHorizontalRounded />
                  )}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-muted sidebar-empty">No recent attempts</p>
          )}
        </div>
      </div>

      {/* Category Progress */}
      <div
        ref={progressRef}
        className={`sidebar-section ${
          focusedSection === "progress" ? "focused" : ""
        }`}
      >
        <h3 className="sidebar-title">Category Progress</h3>
        <div className="category-progress">
          {CATEGORIES.map((category) => {
            const progress = userData.categoryProgress?.[category.id] || 0;
            return (
              <div key={category.id} className="progress-item">
                <div className="progress-header">
                  <span className="progress-icon">
                    {getIconComponent(category.icon, 18)}
                  </span>
                  <span className="progress-name">{category.name}</span>
                  <span className="progress-percentage">{progress}%</span>
                </div>
                <div className="progress-bar" style={{ backgroundColor: 'var(--border-color)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      backgroundColor: category.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievement Badges */}
      <div
        ref={badgesRef}
        className={`sidebar-section ${
          focusedSection === "badges" ? "focused" : ""
        }`}
      >
        <h3 className="sidebar-title">Achievement Badges</h3>
        <div className="achievement-badges">
          {userData.badges && userData.badges.length > 0 ? (
            userData.badges.map((badge) => {
              const progress = badgeProgress[badge.type] || { current: 0, total: 1, description: "In progress" };
              const offset = 283 * (1 - (Math.min(progress.current, progress.total) / Math.max(progress.total, 1)));
              return (
                <div
                  key={badge.id}
                  className={`badge badge-${badge.type}`}
                  onMouseEnter={() => setHoveredBadge(badge.id)}
                  onMouseLeave={() => setHoveredBadge(null)}
                >
                  <svg className="badge-progress-circle" viewBox="0 0 100 100">
                    <circle
                      className="progress-bg"
                      cx="50"
                      cy="50"
                      r="45"
                      strokeWidth="3"
                    />
                    <circle
                      className="progress-ring"
                      cx="50"
                      cy="50"
                      r="45"
                      strokeWidth="3"
                      strokeDasharray="283"
                      strokeDashoffset={offset}
                    />
                  </svg>
                  <span className="badge-icon">
                    {createElement(badge.icon, { size: 20 })}
                  </span>
                  {hoveredBadge === badge.id && (
                    <div className="badge-tooltip">
                      <div className="tooltip-title">{badge.description}</div>
                      <div className="tooltip-progress">
                        <span>{progress.current} / {progress.total}</span>
                      </div>
                      <div className="tooltip-requirement">{progress.description}</div>
                    </div>
                  )}
                </div>
              );
            })
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
