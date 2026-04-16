import { createElement } from "react";
import { CATEGORIES } from "../../../utils/constants";
import { FaCircleCheck, FaClock, FaBolt, BiUser, FaLink, BiFile } from "../../../utils/icons";
import "./ChallengeCard.css";

const ChallengeCard = ({ challenge, onClick, onStatusChange }) => {
  const category = CATEGORIES.find((cat) => cat.id === challenge.category);
  const isSolved = challenge.status === "solved";

  const handleClick = () => {
    // Update status to in_progress if currently unsolved
    if (challenge.status === "unsolved" && onStatusChange) {
      onStatusChange(challenge.id, "in_progress");
    }

    // Call the original onClick handler
    onClick(challenge);
  };

  const getStatusBadge = () => {
    switch (challenge.status) {
      case "solved":
        return (
          <span className="status-badge status-solved">
            <FaCircleCheck /> Solved
          </span>
        );
      case "in_progress":
        return (
          <span className="status-badge status-in-progress">
            <FaClock /> In Progress
          </span>
        );
      default:
        return null;
    }
  };

  const getResourceIcon = () => {
    if (!challenge.attachment) return null;
    
    if (challenge.attachment.type === "link") {
      return <FaLink className="resource-icon" title="External Link" />;
    } else if (challenge.attachment.type === "file") {
      return <BiFile className="resource-icon" title="File Resource" />;
    } else if (challenge.attachment.type === "image") {
      return <span className="resource-icon" title="Image Resource">🖼️</span>;
    }
    return null;
  };

  return (
    <div
      className={`challenge-card difficulty-card difficulty-${
        challenge.difficulty
      } ${isSolved ? "challenge-solved" : ""} ${challenge.status === "in_progress" ? "challenge-in-progress" : ""}`}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      {/* Header */}
      <div className="challenge-card-header">
        <div className="challenge-category">
          <span className="challenge-icon">{category?.icon ? createElement(category.icon, { size: 20 }) : null}</span>
          <span className="challenge-category-name">{category?.name}</span>
        </div>
        <span className={`difficulty-badge difficulty-${challenge.difficulty}`}>
          {challenge.difficulty}
        </span>
      </div>

      {/* Status Badge Overlay */}
      {getStatusBadge() && (
        <div className="status-badge-overlay">{getStatusBadge()}</div>
      )}

      {/* Title */}
      <h3 className="challenge-title">{challenge.title}</h3>

      {/* Description */}
      <p className="challenge-description">{challenge.description}</p>

      {/* Footer */}
      <div className="challenge-card-footer">
        <div className="challenge-meta">
          {challenge.solveCount > 0 && (
            <span className="challenge-solves">
              <BiUser /> {challenge.solveCount} solves
            </span>
          )}
          {getResourceIcon() && (
            <span className="challenge-resource">
              {getResourceIcon()}
            </span>
          )}
        </div>
      </div>

      {/* Personal Best Time (if solved) */}
      {isSolved && challenge.personalBestTime && (
        <div className="challenge-best-time">
          <FaBolt /> Your best: {challenge.personalBestTime}
        </div>
      )}
    </div>
  );
};

export default ChallengeCard;
