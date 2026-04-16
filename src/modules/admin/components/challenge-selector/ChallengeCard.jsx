import React, { useState } from 'react';
import { FaPlus, FaTrash } from '../../../../utils/icons';
import { CATEGORY_ID_TO_KEY, CATEGORY_NAMES, CATEGORIES } from '../../../../utils/constants';
import ChallengeDetailModal from '../challenge-management/ChallengeDetailModal';
import ActionButton from '../../../../common/ActionButton';

const ChallengeCard = ({ challenge, isExpanded, onToggle, onAction, actionType, categoryNames, isLoading, removeTitle }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const resolvedCategoryNames = categoryNames || CATEGORY_NAMES;
  const isReadOnly = actionType === 'view';
  // Get category key from either category_id (numeric) or category (string)
  const categoryKey = challenge.category || CATEGORY_ID_TO_KEY[challenge.category_id];
  const categoryDisplay = resolvedCategoryNames[categoryKey] || categoryKey || 'Unknown';
  
  // Get category icon and color
  const category = CATEGORIES.find(c => c.id === challenge.category_id);
  const CategoryIcon = category?.icon;
  const difficultyColor = challenge.difficulty === 'easy' ? '#10b981' : challenge.difficulty === 'medium' ? '#f59e0b' : '#ef4444';
  
  // Safely parse hints - handle string, JSON string, or array
  const parseHints = (hintsData) => {
    if (!hintsData) return [];
    if (Array.isArray(hintsData)) return hintsData;
    if (typeof hintsData === 'string') {
      try {
        const parsed = JSON.parse(hintsData);
        return Array.isArray(parsed) ? parsed : [hintsData];
      } catch {
        return hintsData.split(',').map(h => h.trim()).filter(h => h);
      }
    }
    return [];
  };
  
  const hints = parseHints(challenge.hints);

  return (
    <div className="challenge-card" style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '100%',
      maxHeight: '500px',
      boxSizing: 'border-box',
      padding: '16px',
      cursor: 'pointer',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#00ff88';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 255, 136, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }}>
      {/* Header with category and difficulty */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#374151',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {CategoryIcon && <CategoryIcon size={14} />}
          {categoryDisplay}
        </span>
        <span style={{
          background: difficultyColor,
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap'
        }}>
          {challenge.difficulty}
        </span>
      </div>

      {/* Content */}
      <div 
        onClick={() => {
          if (actionType === 'remove') {
            // For assigned challenges, open the detail modal
            setShowDetailModal(true);
          } else if (onToggle) {
            // For available challenges, toggle expansion
            onToggle();
          }
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <h4 style={{
          margin: '0 0 8px 0',
          color: '#1f2937',
          fontSize: '14px',
          fontWeight: '600',
          lineHeight: '1.3'
        }}>
          {challenge.title}
        </h4>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '12px',
          lineHeight: '1.4',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {challenge.description || 'No description available'}
        </p>
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#9ca3af',
          fontWeight: '600'
        }}>
          Points: <strong style={{ color: '#3b82f6' }}>{challenge.points || 0}</strong>
        </div>
      </div>

      {/* Action Button - Always visible for remove action, expanded for add action */}
      {(actionType === 'remove' || isExpanded) && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {isExpanded && hints && hints.length > 0 && (
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
              <strong style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hints:</strong>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
                {hints.map((hint, i) => (
                  <li key={i} style={{ color: '#6b7280', marginBottom: '3px' }}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
          {!isReadOnly && (
            <ActionButton
              onClick={() => onAction?.(challenge)}
              isLoading={isLoading === challenge.id}
              icon={actionType === 'add' ? FaPlus : FaTrash}
              variant={actionType === 'add' ? 'success' : 'danger'}
              loadingText={actionType === 'add' ? 'Adding...' : 'Removing...'}
              size="md"
              style={{ marginTop: hints && hints.length > 0 && isExpanded ? '12px' : '0' }}
            >
              {actionType === 'add' ? 'Add' : 'Remove'}
            </ActionButton>
          )}
        </div>
      )}

      {/* Detail Modal for Assigned Challenges */}
      {showDetailModal && actionType === 'remove' && (
        <ChallengeDetailModal
          challenge={challenge}
          onClose={() => setShowDetailModal(false)}
          onEdit={null}
          onDelete={null}
          onMaintenance={null}
          removeTitle={removeTitle}
          onRemove={(ch) => {
            onAction(ch);
            setShowDetailModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ChallengeCard;
