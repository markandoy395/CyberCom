import { createElement } from "react";
import { GrAchievement } from "../../../utils/icons";
import "./AchievementBadges.css";

const AchievementBadges = ({ badges = [], badgeProgress = {} }) => {
  const badgeConfig = {
    "first-blood": {
      title: "First Blood",
      description: "Be the first to solve a challenge",
    },
    "speed-demon": {
      title: "Speed Demon",
      description: "Solve a challenge in under 5 minutes",
    },
    "category-master": {
      title: "Category Master",
      description: "Master all challenges in a category",
    },
  };

  return (
    <div className="achievement-badges-container">
      <div className="badges-header">
        <h3 className="badges-title">
          <GrAchievement className="title-icon" />
          Achievements
        </h3>
      </div>
      <div className="badges-grid">
        {badges.map((badge) => {
          const progress = badgeProgress[badge.type] || {};
          const config = badgeConfig[badge.type] || {};
          const isUnlocked = progress.current >= progress.total;

          return (
            <div
              key={badge.id}
              className={`badge-card ${isUnlocked ? "unlocked" : "locked"}`}
              title={config.description}
            >
              <div className="badge-icon-wrapper">
                {createElement(badge.icon, { className: "badge-icon" })}
              </div>
              <div className="badge-info">
                <h4 className="badge-name">{config.title}</h4>
                <div className="badge-progress">
                  <span className="progress-text">
                    {progress.current || 0}/{progress.total || 0}
                  </span>
                  <div className="progress-bar-mini">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          progress.total
                            ? Math.round((progress.current / progress.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              {isUnlocked && <div className="unlock-badge">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementBadges;
