import React from 'react';
import { CATEGORIES } from '../../../../utils/constants';
import { FaTriangleExclamation } from '../../../../utils/icons';

const ChallengeForm = ({ formData, setFormData, fieldErrors, titleConflict = null }) => {
  const titleInputRef = React.useRef(null);
  const categorySelectRef = React.useRef(null);
  const pointsInputRef = React.useRef(null);  
  const flagInputRef = React.useRef(null);
  const difficulties = ['easy', 'medium', 'hard'];

  const getSuggestedPoints = (categoryIdStr, difficulty) => {
    // Only generate points if both category and difficulty are selected
    if (!categoryIdStr || !difficulty) {
      return '';
    }

    const cid = parseInt(categoryIdStr, 10);
    
    // Define [min, max] ranges for each bracket
    const rangesWebForensics = { easy: [100, 200], medium: [350, 500], hard: [700, 900] }; 
    const rangesCryptoRev = { easy: [150, 250], medium: [400, 600], hard: [750, 950] };    
    const rangesPwn = { easy: [200, 300], medium: [450, 700], hard: [800, 1100] };         
    
    let chart = rangesWebForensics;
    if (cid === 2 || cid === 4) chart = rangesCryptoRev;
    if (cid === 5) chart = rangesPwn;

    let min = 100, max = 200;
    
    if (!cid) {
      if (difficulty === 'easy') { min = 100; max = 300; }
      else if (difficulty === 'medium') { min = 350; max = 650; }
      else if (difficulty === 'hard') { min = 700; max = 1000; }
    } else {
      [min, max] = chart[difficulty] || [100, 200];
    }

    // Generate random value within range, rounded to nearest 5 points
    const step = 5;
    const stepsCount = Math.floor((max - min) / step);
    const randomSteps = Math.floor(Math.random() * (stepsCount + 1));
    return min + (randomSteps * step);
  };

  const getFieldStyle = (fieldName, hasExtraError = false) => ({
    backgroundColor: (fieldErrors[fieldName] || hasExtraError) ? 'rgba(239, 68, 68, 0.05)' : undefined
  });

  const getErrorMessage = (fieldName) => {
    return fieldErrors[fieldName] ? (
      <span style={{ 
        color: '#ef4444', 
        fontSize: '12px', 
        marginTop: '4px', 
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: '500'
      }}>
        <FaTriangleExclamation size={12} /> 
        {fieldName === 'points' ? 'Points must be greater than 0' : 'This field is required'}
      </span>
    ) : null;
  };

  const hasTitleConflict = Boolean(titleConflict);
  const titleErrorMessage = hasTitleConflict ? (
    <span style={{ 
      color: '#ef4444', 
      fontSize: '12px', 
      marginTop: '4px', 
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontWeight: '500'
    }}>
      <FaTriangleExclamation size={12} />
      This title is already used by another challenge.
    </span>
  ) : null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="form-row">
        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: (fieldErrors.title || hasTitleConflict) ? '#ef4444' : '#1f2937' }}>
            Title {(fieldErrors.title || hasTitleConflict) && '*'} 
          </label>
          <input
            ref={titleInputRef}
            type="text"
            className={`form-input ${(fieldErrors.title || hasTitleConflict) ? 'input-error' : ''}`}
            placeholder="e.g., SQL Injection Challenge"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            style={getFieldStyle('title', hasTitleConflict)}
          />
          {getErrorMessage('title') || titleErrorMessage}
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: fieldErrors.category_id ? '#ef4444' : '#1f2937' }}>
            Category {fieldErrors.category_id && '*'}
          </label>
          <select
            ref={categorySelectRef}
            className={`form-input ${fieldErrors.category_id ? 'input-error' : ''}`}
            value={formData.category_id}
            onChange={(e) => {
              const newCat = e.target.value;
              const newPoints = getSuggestedPoints(newCat, formData.difficulty);
              setFormData({...formData, category_id: newCat, points: String(newPoints)});
            }}
            style={getFieldStyle('category_id')}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          {getErrorMessage('category_id')}
        </div>
      </div>

      <div className="form-group">
        <label style={{ fontWeight: '600', color: fieldErrors.description ? '#ef4444' : '#1f2937' }}>
          Description {fieldErrors.description && '*'}
        </label>
        <textarea
          className="form-input textarea-input"
          placeholder="Challenge description, objectives, and hints..."
          rows="4"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          style={getFieldStyle('description')}
        />
        {getErrorMessage('description')}
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: fieldErrors.difficulty ? '#ef4444' : '#1f2937' }}>
            Difficulty {fieldErrors.difficulty && '*'}
          </label>
          <select 
            className={`form-input ${fieldErrors.difficulty ? 'input-error' : ''}`}
            value={formData.difficulty} 
            onChange={(e) => {
              const newDiff = e.target.value;
              const newPoints = getSuggestedPoints(formData.category_id, newDiff);
              setFormData({...formData, difficulty: newDiff, points: String(newPoints)});
            }}
            style={getFieldStyle('difficulty')}
          >
            <option value="">Select a difficulty level</option>
            {difficulties.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
          </select>
          {getErrorMessage('difficulty')}
        </div>
        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: fieldErrors.points ? '#ef4444' : '#1f2937' }}>
            Points {fieldErrors.points && '*'}
          </label>
          <input
            ref={pointsInputRef}
            type="number"
            className={`form-input ${fieldErrors.points ? 'input-error' : ''}`}
            placeholder="e.g., 100"
            value={formData.points}
            onChange={(e) => setFormData({...formData, points: e.target.value})}
            min="1"
            required
            style={getFieldStyle('points')}
          />
          {getErrorMessage('points')}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: fieldErrors.flag ? '#ef4444' : '#1f2937' }}>
            Flag (Answer) {fieldErrors.flag && '*'}
          </label>
          <input
            ref={flagInputRef}
            type="text"
            className={`form-input ${fieldErrors.flag ? 'input-error' : ''}`}
            placeholder="e.g., FLAG{ctf_2024_success}"
            value={formData.flag}
            onChange={(e) => setFormData({...formData, flag: e.target.value})}
            style={getFieldStyle('flag')}
          />
          {getErrorMessage('flag')}
        </div>

        <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ fontWeight: '600', color: '#1f2937' }}>Hints ({formData.hintCount})</label>
          <select
            className="form-input"
            value={formData.hintCount}
            onChange={(e) => {
              const count = parseInt(e.target.value);
              const newHints = [...formData.hints];
              if (count > newHints.length) {
                for (let i = newHints.length; i < count; i++) newHints.push('');
              } else {
                newHints.length = count;
              }
              setFormData({...formData, hintCount: count, hints: newHints});
            }}
          >
            {[1, 2, 3, 4, 5].map(num => <option key={num} value={num}>{num}</option>)}
          </select>
          {Array.from({ length: formData.hintCount }).map((_, idx) => (
            <input
              key={idx}
              type="text"
              className="form-input"
              placeholder={`Hint ${idx + 1}...`}
              value={formData.hints[idx] || ''}
              onChange={(e) => {
                const newHints = [...formData.hints];
                newHints[idx] = e.target.value;
                setFormData({...formData, hints: newHints});
              }}
              style={{ marginTop: '8px' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChallengeForm;
