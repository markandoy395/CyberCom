import React, { useMemo } from 'react';
import CompetitionChallengeCard from '../challenge-management/CompetitionChallengeCard';

const ChallengesList = ({ challenges, searchQuery = '', filterCategory, filterDifficulty, filterStatus, onEdit, onDelete, onViewDetail, loading }) => {
  const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
  
  const filteredChallenges = useMemo(() => {
    let filtered = challenges.filter(challenge => {
      if (filterCategory && challenge.category_id !== parseInt(filterCategory)) return false;
      if (filterDifficulty && challenge.difficulty !== filterDifficulty) return false;
      if (filterStatus && challenge.status !== filterStatus) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = challenge.title?.toLowerCase().includes(query);
        const matchesDescription = challenge.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }
      
      return true;
    });
    
    // Sort by difficulty (easy -> medium -> hard)
    filtered.sort((a, b) => {
      const orderA = difficultyOrder[a.difficulty] || 0;
      const orderB = difficultyOrder[b.difficulty] || 0;
      return orderA - orderB;
    });
    
    return filtered;
  }, [challenges, searchQuery, filterCategory, filterDifficulty, filterStatus]);

  if (loading) {
    return <div className="loading-state"><p>Loading challenges...</p></div>;
  }

  if (filteredChallenges.length === 0) {
    return (
      <div className="empty-state">
        <p>No challenges found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="challenges-grid">
      {filteredChallenges.map(challenge => (
        <CompetitionChallengeCard
          key={challenge.id}
          challenge={challenge}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetail={onViewDetail}
        />
      ))}
    </div>
  );
};

export default ChallengesList;
