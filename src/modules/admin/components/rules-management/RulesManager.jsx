import React, { useEffect, useState } from 'react';
import { FaPencil, FaTrash, FaGavel } from '../../../../utils/icons';
import { apiGet, apiPost, apiPut, API_ENDPOINTS } from '../../../../utils/api';
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
    ? 'Add, edit, or remove competition rules that users will see before entering'
    : 'Add, edit, or remove practice rules that users will see';
  const fallbackRules = getDefaultRules(type);
  const [rules, setRules] = useState(() => getDefaultRules(type));
  const [newRule, setNewRule] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Show message with auto-dismiss
  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    let isMounted = true;

    const loadRules = async () => {
      setLoading(true);

      try {
        const response = await apiGet(API_ENDPOINTS.RULES_LIST(type));

        if (!isMounted) {
          return;
        }

        setRules(getRulesFromResponse(response, type));
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setRules(getDefaultRules(type));
        showMessage(`Failed to load ${type} rules. Showing defaults.`);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRules();

    return () => {
      isMounted = false;
    };
  }, [type]);

  const saveRules = async (updatedRules, successMessage) => {
    setSaving(true);

    try {
      const response = await apiPut(API_ENDPOINTS.ADMIN_RULES_UPDATE(type), {
        rules: updatedRules,
      });

      setRules(getRulesFromResponse(response, type));
      showMessage(successMessage);
      return true;
    } catch (_error) {
      showMessage(`Failed to save ${type} rules`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRule = async () => {
    if (!newRule.trim()) {
      showMessage('Rule cannot be empty');
      return;
    }

    const updatedRules = [...rules, newRule.trim()];

    if (await saveRules(updatedRules, 'Rule added successfully')) {
      setNewRule('');
      setShowAddForm(false);
    }
  };

  const cancelAddRule = () => {
    setNewRule('');
    setShowAddForm(false);
  };

  const deleteRule = async (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);

    await saveRules(updatedRules, 'Rule deleted successfully');
  };

  const startEdit = (index, text) => {
    setEditingId(index);
    setEditingText(text);
  };

  const saveEdit = async () => {
    if (!editingText.trim()) {
      showMessage('Rule cannot be empty');
      return;
    }

    const updatedRules = [...rules];
    updatedRules[editingId] = editingText.trim();

    if (await saveRules(updatedRules, 'Rule updated successfully')) {
      setEditingId(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const resetToDefault = async () => {
    if (window.confirm(`Are you sure you want to reset to default ${type} rules?`)) {
      setSaving(true);

      try {
        const response = await apiPost(API_ENDPOINTS.ADMIN_RULES_RESET(type));
        setRules(getRulesFromResponse(response, type));
        showMessage('Rules reset to default');
      } catch (_error) {
        showMessage(`Failed to reset ${type} rules`);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="rules-manager">
      <div className="rules-manager-header">
        <div className="header-title">
          <FaGavel className="header-icon" />
          <h2>{headerTitle}</h2>
        </div>
        <p>{headerDesc}</p>
      </div>

      {message && (
        <div className="rules-message success">
          {message}
        </div>
      )}

      <div className="rules-manager-content">
        {/* Add New Rule */}
        <div className="rules-add-section">
          <h3>Add New Rule</h3>
          {!showAddForm ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
              disabled={loading || saving}
            >
              + Add New Rule
            </button>
          ) : (
            <div className="rules-input-wrapper">
              <textarea
                className="rules-input"
                placeholder={`Enter a new ${type} rule...`}
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    addRule();
                  }
                }}
                disabled={saving}
                autoFocus
              />
              <div className="rules-input-actions">
                <button className="btn btn-primary" onClick={addRule} disabled={saving}>
                  Save Rule
                </button>
                <button className="btn btn-ghost" onClick={cancelAddRule} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rules List */}
        <div className="rules-list-section">
          <div className="rules-list-header">
            <h3>Current Rules ({rules.length})</h3>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={resetToDefault}
              disabled={loading || saving}
            >
              Reset to Default
            </button>
          </div>

          <div className="rules-items">
            {loading ? (
              <div className="rules-empty">
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="rules-empty">
                No rules added yet. Click "Add Rule" to create one.
              </div>
            ) : (
              rules.map((rule, index) => (
                <div key={index} className="rules-item">
                  <div className="rule-number">{index + 1}</div>
                  
                  {editingId === index ? (
                    <div className="rule-edit-mode">
                      <textarea
                        className="rule-edit-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        disabled={saving}
                      />
                      <div className="rule-edit-actions">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={saveEdit}
                          disabled={saving}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rule-view-mode">
                      <p className="rule-text">{rule}</p>
                      <div className="rule-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => startEdit(index, rule)}
                          title="Edit rule"
                          disabled={saving}
                        >
                          <FaPencil className="btn-icon" /> Edit
                        </button>
                        <button
                          className="btn btn-error btn-sm"
                          onClick={() => deleteRule(index)}
                          title="Delete rule"
                          disabled={saving}
                        >
                          <FaTrash className="btn-icon" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="rules-preview-section">
          <h3>Preview</h3>
          <div className="rules-preview-card">
            <p className="preview-text">Users will see these rules when {isCompetition ? 'entering the competition' : 'practicing'}:</p>
            <div className="rules-preview-list">
              {(loading ? fallbackRules : rules).map((rule, index) => (
                <div key={index} className="preview-rule-item">
                  <span className="preview-number">{index + 1}</span>
                  <span className="preview-text">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesManager;
