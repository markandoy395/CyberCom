import React, { useEffect, useState } from 'react';
import { FaPencil, FaTrash, FaGavel, FaPlus, FaCheck, FaXmark, FaRotateLeft, FaListUl, FaEye } from '../../../../utils/icons';
import { apiGet, apiPost, apiPut, API_ENDPOINTS } from '../../../../utils/api';
import ActionButton from '../../../../common/ActionButton';
import { getDefaultRules, getRulesFromResponse } from '../../../../utils/rules';
import './RulesManager.css';

/**
 * Unified RulesManager for both Competition and Practice rules
 * @param {string} type - 'competition' or 'practice'
 */
const RulesManager = ({ type = 'competition' }) => {
  const isCompetition = type === 'competition';
  const headerTitle = isCompetition ? 'Competition Rules Manager' : 'Practice Rules Manager';
  const headerDesc = isCompetition
    ? 'Add, edit, or remove the rules participants see before entering the competition.'
    : 'Add, edit, or remove the rules players see before starting a practice session.';
  const fallbackRules = getDefaultRules(type);
  const [rules, setRules] = useState(() => getDefaultRules(type));
  const [newRule, setNewRule] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Show message with auto-dismiss */
  const showMessage = (text, variant = 'success') => {
    setMessage(text);
    setMessageType(variant);
    setTimeout(() => setMessage(''), 3200);
  };

  useEffect(() => {
    let isMounted = true;
    const loadRules = async () => {
      setLoading(true);
      try {
        const response = await apiGet(API_ENDPOINTS.RULES_LIST(type));
        if (!isMounted) return;
        setRules(getRulesFromResponse(response, type));
      } catch (_error) {
        if (!isMounted) return;
        setRules(getDefaultRules(type));
        showMessage(`Failed to load ${type} rules. Showing defaults.`, 'error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadRules();
    return () => { isMounted = false; };
  }, [type]);

  const saveRules = async (updatedRules, successMessage) => {
    setSaving(true);
    try {
      const response = await apiPut(API_ENDPOINTS.ADMIN_RULES_UPDATE(type), { rules: updatedRules });
      setRules(getRulesFromResponse(response, type));
      showMessage(successMessage, 'success');
      return true;
    } catch (_error) {
      showMessage(`Failed to save ${type} rules`, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) { showMessage('Rule cannot be empty', 'error'); return; }
    const updatedRules = [...rules, newRule.trim()];
    if (await saveRules(updatedRules, 'Rule added successfully ✓')) {
      setNewRule('');
      setShowAddForm(false);
    }
  };

  const cancelAddRule = () => { setNewRule(''); setShowAddForm(false); };

  const deleteRule = async (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    await saveRules(updatedRules, 'Rule deleted successfully ✓');
  };

  const startEdit = (index, text) => { setEditingId(index); setEditingText(text); };

  const saveEdit = async () => {
    if (!editingText.trim()) { showMessage('Rule cannot be empty', 'error'); return; }
    const updatedRules = [...rules];
    updatedRules[editingId] = editingText.trim();
    if (await saveRules(updatedRules, 'Rule updated successfully ✓')) {
      setEditingId(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditingText(''); };

  const resetToDefault = async () => {
    if (!window.confirm(`Reset all ${type} rules to default? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const response = await apiPost(API_ENDPOINTS.ADMIN_RULES_RESET(type));
      setRules(getRulesFromResponse(response, type));
      showMessage('Rules reset to default ✓', 'success');
    } catch (_error) {
      showMessage(`Failed to reset ${type} rules`, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* Stagger animation delay per item */
  const itemStyle = (i) => ({ animationDelay: `${i * 0.05}s` });

  return (
    <div className="rules-manager">

      {/* ── Header Banner ── */}
      <div className="rules-manager-header">
        <div className="rm-header-body">
          <div className="rm-header-icon-wrap">
            <FaGavel className="header-icon" />
          </div>
          <div className="rm-header-text">
            <h2>{headerTitle}</h2>
            <p>{headerDesc}</p>
          </div>
          <div className="rm-header-badge">
            <span className="rm-header-badge-dot" />
            {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}
          </div>
        </div>
      </div>

      {/* ── Toast Message ── */}
      {message && (
        <div className={`rules-message ${messageType}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── Add New Rule Panel ── */}
      <div className="rm-panel">
        <div className="rm-panel-title">
          <span className="rm-panel-title-icon"><FaPlus /></span>
          Add New Rule
        </div>

        {!showAddForm ? (
          <button
            className="rm-add-trigger"
            onClick={() => setShowAddForm(true)}
            disabled={loading || saving}
          >
            <span className="rm-add-plus-icon">+</span>
            Click to add a new rule…
          </button>
        ) : (
          <div className="rm-input-form">
            <textarea
              className="rm-textarea"
              placeholder={`Describe the rule for ${type === 'competition' ? 'competition' : 'practice'} participants…`}
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addRule();
                if (e.key === 'Escape') cancelAddRule();
              }}
              disabled={saving}
              autoFocus
            />
            <p className="rm-form-hint">Tip: Press Ctrl+Enter to save quickly, or Esc to cancel.</p>
            <div className="rm-form-actions">
              <button className="rm-btn rm-btn-ghost" onClick={cancelAddRule} disabled={saving}>
                <FaXmark /> Cancel
              </button>
              <ActionButton
                className="rm-btn rm-btn-primary"
                onClick={addRule}
                variant="custom"
                size="custom"
                isLoading={saving}
                loadingText="Saving Rule..."
              >
                <FaCheck /> Save Rule
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      {/* ── Current Rules Panel ── */}
      <div className="rm-panel">
        <div className="rm-panel-title" style={{ marginBottom: 0 }}>
          <span className="rm-panel-title-icon"><FaListUl /></span>
          Current Rules
          <span className="rm-panel-title-count">{loading ? '–' : rules.length}</span>
        </div>

        <div className="rm-list-header" style={{ marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${rules.length} rule${rules.length !== 1 ? 's' : ''} configured`}
          </span>
          <button
            className="rm-btn rm-btn-secondary"
            onClick={resetToDefault}
            disabled={loading || saving}
          >
            <FaRotateLeft /> Reset to Default
          </button>
        </div>

        <div className="rm-rules-list">
          {loading ? (
            <>
              <div className="rm-skeleton" />
              <div className="rm-skeleton" style={{ animationDelay: '0.15s' }} />
              <div className="rm-skeleton" style={{ animationDelay: '0.3s' }} />
            </>
          ) : rules.length === 0 ? (
            <div className="rm-empty">
              <span className="rm-empty-icon">📋</span>
              <p>No rules configured yet. Click <strong>"Add New Rule"</strong> above to get started.</p>
            </div>
          ) : (
            rules.map((rule, index) => (
              <div key={index} className="rm-rule-item" style={itemStyle(index)}>
                <div className="rm-rule-num">{index + 1}</div>

                {editingId === index ? (
                  <div className="rm-rule-edit">
                    <textarea
                      className="rm-rule-edit-textarea"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      disabled={saving}
                      autoFocus
                    />
                    <div className="rm-rule-edit-actions">
                      <button className="rm-btn rm-btn-ghost rm-btn-icon-only" onClick={cancelEdit} disabled={saving} title="Cancel">
                        <FaXmark /> Cancel
                      </button>
                      <ActionButton
                        className="rm-btn rm-btn-success"
                        onClick={saveEdit}
                        variant="custom"
                        size="custom"
                        isLoading={saving}
                        loadingText="Saving..."
                        title="Save changes"
                      >
                        <FaCheck /> Save
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <div className="rm-rule-view">
                    <p className="rm-rule-text">{rule}</p>
                    <div className="rm-rule-actions">
                      <button
                        className="rm-btn rm-btn-ghost rm-btn-icon-only"
                        onClick={() => startEdit(index, rule)}
                        title="Edit rule"
                        disabled={saving}
                      >
                        <FaPencil />
                      </button>
                      <button
                        className="rm-btn rm-btn-danger rm-btn-icon-only"
                        onClick={() => deleteRule(index)}
                        title="Delete rule"
                        disabled={saving}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Preview Panel ── */}
      <div className="rm-panel">
        <div className="rm-panel-title">
          <span className="rm-panel-title-icon"><FaEye /></span>
          User Preview
          <span className="rm-panel-title-count" style={{ background: 'rgba(5,150,105,0.1)', borderColor: 'rgba(5,150,105,0.25)', color: '#10b981' }}>
            Live
          </span>
        </div>

        <div className="rm-preview-card">
          <p className="rm-preview-intro">
            Participants {isCompetition ? 'entering the competition' : 'starting a practice session'} will see:
          </p>
          <div className="rm-preview-list">
            {(loading ? fallbackRules : rules).map((rule, index) => (
              <div key={index} className="rm-preview-item">
                <span className="rm-preview-num">{index + 1}</span>
                <p className="rm-preview-text">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default RulesManager;
