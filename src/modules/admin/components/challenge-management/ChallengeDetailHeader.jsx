import { createElement } from 'react';
import { FaXmark, FaPenToSquare, FaTrash, FaBolt, FaCircleCheck } from '../../../../utils/icons';
import { CATEGORIES } from '../../../../utils/constants';

/**
 * Challenge Detail Modal Header - displays category, difficulty, and action buttons
 */
const ChallengeDetailHeader = ({ challenge, onClose, onEdit, onDelete, onMaintenance, onRemove, removeTitle }) => {
  const category = CATEGORIES.find((cat) => cat.id === parseInt(challenge.category_id, 10));
  const isUnderMaintenance = challenge.status === 'under_maintenance';

  return (
    <div className="modal-header">
      <div className="header-left">
        {category && (
          <div className="category-badge">
            {category.icon && createElement(category.icon, { size: 16 })}
            <span>{category.name}</span>
          </div>
        )}
      </div>
      <div className="header-right">
        <div className={`difficulty-badge difficulty-${challenge.difficulty}`}>
          {challenge.difficulty}
        </div>
        
        {/* Action Buttons */}
        <div className="modal-actions">
          {onEdit && (
            <button
              className="action-icon-btn edit-btn"
              onClick={() => onEdit(challenge)}
              title="Edit"
            >
              <FaPenToSquare size={14} />
              <span className="action-tooltip">Edit</span>
            </button>
          )}
          
          {onMaintenance && (
            <button
              className="action-icon-btn maintenance-btn"
              onClick={() => onMaintenance(challenge)}
              title={isUnderMaintenance ? "Back to Normal" : "Maintenance"}
            >
              {isUnderMaintenance ? <FaCircleCheck size={14} /> : <FaBolt size={14} />}
              <span className="action-tooltip">{isUnderMaintenance ? 'Back to Normal' : 'Maintenance'}</span>
            </button>
          )}

          {onDelete && (
            <button
              className="action-icon-btn delete-btn"
              onClick={() => onDelete(challenge.id)}
              title="Delete"
            >
              <FaTrash size={14} />
              <span className="action-tooltip">Delete</span>
            </button>
          )}
        </div>

        <button className="btn-close" onClick={onClose} title="Close">
          <FaXmark size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChallengeDetailHeader;
