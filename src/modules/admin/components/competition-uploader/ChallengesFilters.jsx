import React from 'react';
import { CATEGORIES } from '../../../../utils/constants';

const ChallengesFilters = ({ challenges = [], filterCategory, filterDifficulty, filterStatus, onCategoryChange, onDifficultyChange, onStatusChange, onClearFilters }) => {
  const difficulties = ['easy', 'medium', 'hard'];
  const statuses = ['active', 'inactive', 'under_maintenance', 'draft'];
  const hasActiveFilter = filterCategory || filterDifficulty || filterStatus;

  // Calculate category counts
  const categoryCounts = {};
  challenges.forEach(challenge => {
    const catId = challenge.category_id;
    categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
  });

  return (
    <div className="filters-container">
      <div className="filter-row">
        <div className="filter-group">
          <label>Category</label>
          <select value={filterCategory} onChange={(e) => onCategoryChange(e.target.value)} className="filter-select">
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => {
              const count = categoryCounts[cat.id] || 0;
              return <option key={cat.id} value={cat.id}>{cat.name} ({count})</option>;
            })}
          </select>
        </div>

        <div className="filter-group">
          <label>Difficulty</label>
          <select value={filterDifficulty} onChange={(e) => onDifficultyChange(e.target.value)} className="filter-select">
            <option value="">All Difficulties</option>
            {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => onStatusChange(e.target.value)} className="filter-select">
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {hasActiveFilter && (
          <button className="btn btn-ghost clear-filters-btn" onClick={onClearFilters}>
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengesFilters;
