import React from 'react';

const CompetitionSelector = ({ competitions, selectedCompetition, onSelect, isLoading }) => {
  return (
    <div className="competition-selector" style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Competition *</label>
      <select 
        className="form-input"
        value={selectedCompetition || ''} 
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
        style={{ maxWidth: '400px' }}
      >
        <option value="">-- Choose a competition --</option>
        {competitions.map(comp => (
          <option key={comp.id} value={comp.id}>{comp.name}</option>
        ))}
      </select>
    </div>
  );
};

export default CompetitionSelector;
