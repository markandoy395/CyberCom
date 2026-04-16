import React from 'react';
import ChallengeCard from './ChallengeCard';

const ChallengesGrid = ({ title, challenges, expandedCardId, onToggleExpansion, onCardAction, actionType, categoryNames, isLoading, emptyMessage, removeTitle }) => {
  if (!challenges || challenges.length === 0) {
    // Don't show message for available challenges (shown in modal instead)
    // Only show message for assigned challenges
    if (actionType === 'add') {
      return null;
    }
    const fallbackMessage = actionType === 'remove' ? 'No assigned challenges' : 'No challenges found';
    return <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>{emptyMessage || fallbackMessage}</div>;
  }

  // Use scrollable container for assigned challenges only
  const isAssigned = actionType === 'remove';
  const containerClass = isAssigned ? 'assigned-challenges-container' : '';
  
  return (
    <div 
      className="challenges-grid-section" 
      style={{ 
        marginTop: '24px', 
        maxWidth: '100%', 
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {title && <h3>{title}</h3>}
      <div 
        className={containerClass}
        style={isAssigned ? {
          maxHeight: '600px',
          maxWidth: '100%',
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '8px',
          boxSizing: 'border-box'
        } : {}}
      >
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)',  
          gap: '16px', 
          maxWidth: '100%',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isExpanded={expandedCardId === challenge.id}
              onToggle={() => onToggleExpansion?.(challenge.id)}
              onAction={onCardAction}
              actionType={actionType}
              categoryNames={categoryNames}
              isLoading={isLoading}
              removeTitle={removeTitle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChallengesGrid;
