import { createElement } from "react";
import { CATEGORIES } from "../../../../utils/constants";
import { FaCircleCheck, FaClock, FaTriangleExclamation } from "../../../../utils/icons";
import "./CompetitionChallengeCard.css";

const CompetitionChallengeCard = ({ challenge, onClick, _onEdit, _onDelete, onViewDetail }) => {
  // Convert category_id to number in case it's a string from database
  const categoryId = parseInt(challenge.category_id, 10);
  const category = CATEGORIES.find((cat) => cat.id === categoryId);

  const isUnderMaintenance = challenge.status === 'under_maintenance';

  const handleCardClick = () => {
    if (onViewDetail) {
      onViewDetail(challenge);
    } else if (onClick) {
      onClick(challenge);
    }
  };

  return (
    <div 
      className={`admin-challenge-card difficulty-${challenge.difficulty} ${isUnderMaintenance ? 'is-under-maintenance' : ''}`}
      onClick={handleCardClick}
    >
      {/* Under Maintenance Overlay */}
      {isUnderMaintenance && (
        <div className="maintenance-overlay">
          <div className="maintenance-overlay-content">
            <div className="maintenance-overlay-icon">
              <FaTriangleExclamation size={48} />
            </div>
            <div className="maintenance-overlay-text">Under<br/>Maintenance</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="admin-challenge-header">
        <div className="admin-challenge-category">
          <span className="admin-challenge-icon">
            {category?.icon ? createElement(category.icon, { size: 18 }) : null}
          </span>
          <span className="admin-challenge-category-name">
            {category?.name || `Category ${challenge.category_id}`}
          </span>
        </div>
        <div className="admin-challenge-header-right">
          <span className={`admin-difficulty-badge difficulty-${challenge.difficulty}`}>
            {challenge.difficulty}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="admin-challenge-title">{challenge.title}</h3>

      {/* Description */}
      <p className="admin-challenge-description">{challenge.description}</p>

      {/* Meta Info */}
      <div className="admin-challenge-meta">
        <span className="meta-item points-item">
          <strong>Points:</strong> {challenge.points}
        </span>
      </div>

      {/* Footer */}
      <div className="admin-challenge-footer">
      </div>
    </div>
  );
};

export default CompetitionChallengeCard;
