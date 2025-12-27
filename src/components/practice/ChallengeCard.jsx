import { Link } from "react-router-dom";
import { CATEGORIES } from "../../utils/constants";
import "./ChallengeCard.css";

const ChallengeCard = ({ challenge }) => {
  const category = CATEGORIES.find((cat) => cat.id === challenge.category);

  const getStatusBadge = () => {
    switch (challenge.status) {
      case "solved":
        return <span className="status-badge status-solved">✓ Solved</span>;
      case "in_progress":
        return (
          <span className="status-badge status-in-progress">
            ⏱️ In Progress
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Link to={`/challenge/${challenge.id}`} className="challenge-card-link">
      <div
        className={`challenge-card category-card category-${category?.color}`}
      >
        {/* Header */}
        <div className="challenge-card-header">
          <div className="challenge-category">
            <span className="challenge-icon">{category?.icon}</span>
            <span className="challenge-category-name">{category?.name}</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Title */}
        <h3 className="challenge-title">{challenge.title}</h3>

        {/* Description */}
        <p className="challenge-description">{challenge.description}</p>

        {/* Footer */}
        <div className="challenge-card-footer">
          <span
            className={`difficulty-badge difficulty-${challenge.difficulty}`}
          >
            {challenge.difficulty}
          </span>
          <div className="challenge-meta">
            <span className="challenge-points">{challenge.points} pts</span>
            {challenge.solveCount > 0 && (
              <span className="challenge-solves">
                {challenge.solveCount} solves
              </span>
            )}
          </div>
        </div>

        {/* Personal Best Time (if solved) */}
        {challenge.personalBestTime && (
          <div className="challenge-best-time">
            ⚡ Your best: {challenge.personalBestTime}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ChallengeCard;
