import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiPost, API_ENDPOINTS } from '../../../../utils/api';
import {
  DEFAULT_COMPETITION_FORM,
  MAX_COMPETITION_DURATION_HOURS,
  MAX_COMPETITION_DURATION_MS,
} from '../../constants';
import './BaseModal.css';
import './CompetitionCreateModal.css';
import {
  LuSettings2, LuTrophy, LuFileText, LuCalendar, LuUsers,
  LuCheck, LuX, LuCircleHelp, LuChevronDown, LuChevronUp, LuLoader
} from 'react-icons/lu';

/** Pure-CSS tooltip wrapper — hover the ? icon to reveal content */
const InfoTooltip = ({ content }) => (
  <span className="info-tooltip-trigger">
    <LuCircleHelp size={14} className="info-tooltip-icon" />
    <span className="info-tooltip-content">{content}</span>
  </span>
);

const CompetitionCreateModal = ({ closeModal, onCompetitionCreated }) => {
  const [formData, setFormData] = useState(DEFAULT_COMPETITION_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showScoring, setShowScoring] = useState(false);

  const handleWeightSliderChange = (e) => {
    const solverVal = parseInt(e.target.value, 10);
    const timeVal = 100 - solverVal;
    setFormData(prev => ({
      ...prev,
      scoringSettings: {
        ...prev.scoringSettings,
        solverWeight: (solverVal / 100).toFixed(2),
        timeWeight: (timeVal / 100).toFixed(2)
      }
    }));
  };

  const handleChangeScoring = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      scoringSettings: {
        ...prev.scoringSettings,
        [name]: value
      }
    }));
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const getCompetitionDurationMs = () => {
    if (!formData.startDate || !formData.endDate) {
      return null;
    }

    const startMs = new Date(formData.startDate).getTime();
    const endMs = new Date(formData.endDate).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return null;
    }

    return endMs - startMs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const durationMs = getCompetitionDurationMs();

    if (!formData.name.trim()) newErrors.name = 'Competition name is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (durationMs !== null && durationMs > MAX_COMPETITION_DURATION_MS) {
      newErrors.endDate = `Competition duration cannot exceed ${MAX_COMPETITION_DURATION_HOURS} hours`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {

      const response = await apiPost(API_ENDPOINTS.COMPETITIONS_CREATE, {
        name: formData.name,
        description: formData.description,
        start_date: formData.startDate,
        end_date: formData.endDate,
        max_participants: parseInt(formData.maxParticipants) || 8,
        status: 'upcoming',
        scoring_settings: formData.scoringSettings && Object.keys(formData.scoringSettings || {}).length > 0 ? Object.fromEntries(
          Object.entries(formData.scoringSettings).map(([k, v]) => [k, parseFloat(v) || 0])
        ) : null
      });

      if (response.success || response.id) {
        if (onCompetitionCreated) {
          onCompetitionCreated(response);
        }
        closeModal('createCompetition');
      } else {
        setErrors({ _form: response.error || response.message || 'Failed to create competition' });
      }
    } catch (err) {
      setErrors({ _form: err.message || 'An error occurred while creating the competition' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Discard changes?')) {
      closeModal('createCompetition');
    }
  };

  return createPortal(
    <div className="admin-modal-backdrop" onClick={handleCancel}>
      <div className="admin-modal-panel competition-create-modal" onClick={(e) => e.stopPropagation()}>

        {/* ─── Header ─── */}
        <div className="modal-header">
          <div>
            <h2><LuTrophy size={20} className="icon-primary" /> Create New Competition</h2>
            <p className="modal-subtitle">Set up a new competition with custom rules and scoring configuration.</p>
          </div>
          <button className="modal-close-btn" onClick={handleCancel} aria-label="Close">
            <LuX size={18} />
          </button>
        </div>

        {/* ─── Form ─── */}
        <form onSubmit={handleSubmit} className="competition-form">
          {errors._form && (
            <div className="form-error">
              <span>⚠</span> {errors._form}
            </div>
          )}

          {/* Competition Name */}
          <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
            <label htmlFor="name">
              <LuFileText size={16} className="icon-muted" />
              Competition Name <span className="asterisk">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="CTF Spring 2024"
              maxLength="100"
              disabled={loading}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">
              <LuFileText size={16} className="icon-muted" />
              Description
            </label>
            <p className="form-description">Optional description for the competition (max 500 characters)</p>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the competition..."
              rows="3"
              maxLength="500"
              disabled={loading}
            />
            <span className="char-count">{(formData.description || '').length}/500</span>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className={`form-group ${errors.startDate ? 'has-error' : ''}`}>
              <label htmlFor="startDate">
                <LuCalendar size={16} className="icon-muted" />
                Start Date <span className="asterisk">*</span>
              </label>
              <input
                type="datetime-local"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.startDate && <span className="field-error">{errors.startDate}</span>}
            </div>
            <div className={`form-group ${errors.endDate ? 'has-error' : ''}`}>
              <label htmlFor="endDate">
                <LuCalendar size={16} className="icon-muted" />
                End Date <span className="asterisk">*</span>
              </label>
              <input
                type="datetime-local"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.endDate && <span className="field-error">{errors.endDate}</span>}
            </div>
          </div>
          <p className="form-description">Competition duration must be 8 hours or less.</p>

          {/* Max Participants */}
          <div className="form-group">
            <label htmlFor="maxParticipants">
              <LuUsers size={16} className="icon-muted" />
              Max Participants
            </label>
            <p className="form-description">Between 1 and 8 participants</p>
            <input
              type="number"
              id="maxParticipants"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleChange}
              min="1"
              max="999"
              disabled={loading}
            />
          </div>

          {/* ─── Advanced Scoring ─── */}
          <div className="advanced-scoring-section">
            <button
              type="button"
              className="btn-toggle-scoring"
              onClick={() => setShowScoring(!showScoring)}
            >
              <LuSettings2 size={16} className="icon-accent" />
              <span>Advanced Scoring Configuration</span>
              {showScoring
                ? <LuChevronUp size={16} className="icon-muted chevron-right" />
                : <LuChevronDown size={16} className="icon-muted chevron-right" />
              }
            </button>

            {showScoring && (
              <>
                <div className="premium-scoring-container">
                  <p className="instruction">Configure decay mechanics for dynamic scoring. Recommended defaults are pre-filled.</p>

                  {/* Solver vs Time slider */}
                  <div className="premium-scoring-header">
                    <label>
                      Solver Weight vs Time Weight
                      <InfoTooltip content="Solver Weight: Points lost because other teams solve the puzzle first. Time Weight: Points lost just because the clock is ticking." />
                    </label>
                  </div>
                  <div className="premium-weight-labels">
                    <span>Solver: {Math.round((formData.scoringSettings?.solverWeight || 0.8) * 100)}%</span>
                    <span>Time: {Math.round((formData.scoringSettings?.timeWeight || 0.2) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round((formData.scoringSettings?.solverWeight || 0.8) * 100)}
                    onChange={handleWeightSliderChange}
                    disabled={loading}
                    className="premium-slider"
                  />
                  <div className="premium-slider-footer">
                    <span>Recommended: 80/20</span>
                    <span className="premium-tag">
                      {Math.round((formData.scoringSettings?.solverWeight || 0.8) * 100)}/{Math.round((formData.scoringSettings?.timeWeight || 0.2) * 100)}
                    </span>
                  </div>
                </div>

                {/* Scoring params table */}
                <div className="premium-scoring-table">
                  <div className="premium-table-header">
                    <div className="premium-cell">
                      <span>Solver Decay</span>
                      <InfoTooltip content="How fast points drop when another team grabs them. Higher values cause faster score decay." />
                    </div>
                    <div className="premium-cell">
                      <span>Attempt Penalty</span>
                      <InfoTooltip content="Points lost for every wrong guess. Stops spamming answers." />
                    </div>
                    <div className="premium-cell">
                      <span>Min Score Floor</span>
                      <InfoTooltip content="The absolute minimum points guaranteed, even if dead last." />
                    </div>
                  </div>
                  <div className="premium-table-body">
                    <div className="premium-cell">
                      <input type="number" step="0.01" min="0" max="1" name="solverDecayConstant" value={formData.scoringSettings?.solverDecayConstant || ''} onChange={handleChangeScoring} disabled={loading} className="premium-input-cell" />
                      <span className="premium-subtext">Rec: 0.12</span>
                    </div>
                    <div className="premium-cell">
                      <input type="number" step="0.01" min="0" max="1" name="attemptPenaltyConstant" value={formData.scoringSettings?.attemptPenaltyConstant || ''} onChange={handleChangeScoring} disabled={loading} className="premium-input-cell" />
                      <span className="premium-subtext">Rec: 0.05</span>
                    </div>
                    <div className="premium-cell">
                      <input type="number" step="1" min="0" name="minScoreFloor" value={formData.scoringSettings?.minScoreFloor || ''} onChange={handleChangeScoring} disabled={loading} className="premium-input-cell" />
                      <span className="premium-subtext">Rec: 20</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ─── Actions ─── */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel} disabled={loading}>
              <LuX size={16} /> Cancel
            </button>
            <button type="submit" className="btn-success" disabled={loading}>
              {loading
                ? <><LuLoader size={16} className="spinner-icon" /> Creating...</>
                : <><LuCheck size={16} /> Create Competition</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CompetitionCreateModal;
