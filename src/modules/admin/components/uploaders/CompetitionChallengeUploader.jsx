import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiCall } from '../../../../utils/api';
import NotificationModal from '../../../../common/NotificationModal';
import ActionButton from '../../../../common/ActionButton';
import ChallengeDetailModal from '../challenge-management/ChallengeDetailModal';
import { ChallengeForm, ResourceUploader, ChallengesFilters, ChallengesList, useChallengeForm } from '../competition-uploader';
import { FaPlus, FaPencil } from '../../../../utils/icons';
import './CompetitionChallengeUploader.css';

const CompetitionChallengeUploader = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { formData, setFormData, fieldErrors, resetForm, validateForm } = useChallengeForm();
  const [notification, setNotification] = useState(null);
  
  const handleDismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const showResult = useCallback((message, isSuccess) => {
    setNotification({
      type: isSuccess ? 'success' : 'error',
      title: isSuccess ? 'Success' : 'Error',
      message,
    });
  }, []);

  // Check if form has unsaved data
  const hasUnsavedData = useCallback(() => {
    const defaultValues = {
      title: '',
      category_id: '',
      difficulty: '',
      points: '',
      description: '',
      flag: '',
      resources: [],
    };
    return (
      formData.title !== defaultValues.title ||
      formData.category_id !== defaultValues.category_id ||
      formData.points !== defaultValues.points ||
      formData.description !== defaultValues.description ||
      formData.flag !== defaultValues.flag ||
      (Array.isArray(formData.resources) && formData.resources.length > 0) ||
      (formData.hints && formData.hints.some(h => h.trim()))
    );
  }, [formData]);

  const handleCloseForm = useCallback(() => {
    if (hasUnsavedData()) {
      setShowConfirmation(true);
    } else {
      resetForm();
      setShowForm(false);
      setEditingId(null);
    }
  }, [hasUnsavedData, resetForm]);

  // Portal element for modal
  const portalElement = useMemo(() => {
    let element = document.getElementById("challenge-form-portal");
    if (!element) {
      element = document.createElement("div");
      element.id = "challenge-form-portal";
      document.body.appendChild(element);
    }
    return element;
  }, []);

  // Handle modal open/close effects
  useEffect(() => {
    if (!showForm) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        handleCloseForm();
      }
    };

    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.top = `-${scrollY}px`;

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.position = "static";
      document.body.style.width = "auto";
      document.body.style.top = "auto";
      window.removeEventListener("keydown", handleEsc);
      window.scrollTo(0, scrollY);
    };
  }, [showForm, handleCloseForm]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseForm();
    }
  };

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/challenges`);
      const data = await response.json();
      if (data.success) setChallenges(data.data || []);
      else showResult('Error loading challenges', false);
    } catch {
      showResult('Error loading challenges', false);
    } finally {
      setLoading(false);
    }
  }, [showResult]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const saveChallenge = async () => {
    // Prevent multiple submissions
    if (loading) return;

    if (!validateForm()) {
      // Build error message for specific empty fields
      const errorFields = [];
      if (fieldErrors.title) errorFields.push('Title');
      if (fieldErrors.category_id) errorFields.push('Category');
      if (fieldErrors.points) errorFields.push('Points');
      if (fieldErrors.flag) errorFields.push('Flag');
      if (fieldErrors.description) errorFields.push('Description');
      if (fieldErrors.resources) errorFields.push('Resources');

      const errorMsg = `Please fill in: ${errorFields.join(', ')}`;
      showResult(errorMsg, false);
      return;
    }

    try {
      setLoading(true);
      const categoryId = parseInt(formData.category_id);
      if (isNaN(categoryId) || categoryId < 1) {
        showResult('Invalid category selected', false);
        setLoading(false);
        return;
      }

      const pointsValue = parseInt(formData.points, 10);
      if (isNaN(pointsValue) || pointsValue <= 0) {
        showResult('Points must be a positive number', false);
        setLoading(false);
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        category_id: categoryId,
        difficulty: formData.difficulty,
        points: parseInt(formData.points),
        flag: formData.flag,
        hints: Array.isArray(formData.hints) ? formData.hints.filter(h => h.trim()) : [],
        resources: Array.isArray(formData.resources) ? formData.resources : []
      };

      // Check for duplicates only when creating new challenges
      if (!editingId) {
        const isDuplicate = challenges.some(challenge => 
          challenge.title.toLowerCase().trim() === payload.title.toLowerCase().trim() &&
          challenge.category_id === payload.category_id &&
          challenge.description.toLowerCase().trim() === payload.description.toLowerCase().trim() &&
          challenge.difficulty === payload.difficulty
        );

        if (isDuplicate) {
          showResult('A challenge with the same title, category, description, and difficulty level already exists.', false);
          setLoading(false);
          return;
        }
      }

      const url = editingId ? `/challenges/${editingId}` : `/challenges`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await apiCall(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        showResult(editingId ? 'Challenge updated successfully!' : 'Challenge created successfully!', true);
        resetForm();
        setShowForm(false);
        setEditingId(null);
        fetchChallenges();
      } else {
        showResult(`Error: ${data.error || 'Unknown error'}`, false);
      }
    } catch (error) {
      console.error('[CompetitionChallengeUploader] Error:', error);
      showResult(`Error: ${error.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const response = await apiCall(`/challenges/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        showResult('Challenge deleted!', true);
        fetchChallenges();
        setShowDetailModal(false);
      } else {
        showResult(`Error: ${data.error}`, false);
      }
    } catch (error) {
      showResult(`Error: ${error.message}`, false);
    }
  };

  const editChallenge = (challenge) => {
    // Normalize hints to always be an array
    let hints = challenge.hints || [];
    if (typeof hints === 'string') {
      try {
        hints = JSON.parse(hints);
      } catch {
        hints = []; // If parsing fails, use empty array
      }
    }
    if (!Array.isArray(hints)) {
      hints = []; // Ensure it's an array
    }
    
    setFormData({
      ...challenge,
      hints: hints,
      hintCount: hints.length || 1
    });
    setEditingId(challenge.id);
    setShowForm(true);
    setShowDetailModal(false);
  };

  const handleMaintenance = async (challenge) => {
    const newStatus = challenge.status === 'under_maintenance' ? 'active' : 'under_maintenance';
    try {
      const response = await apiCall(`/challenges/${challenge.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        showResult(`Challenge ${newStatus === 'under_maintenance' ? 'put on' : 'removed from'} maintenance`, true);
        // Refresh challenges list to update UI
        fetchChallenges();
      }
    } catch (error) {
      showResult(`Error: ${error.message}`, false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <NotificationModal notification={notification} onDismiss={handleDismissNotification} duration={5000} />

      <div className="uploader-header" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, padding: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
          <h2 className="uploader-title">CyberCom Challenges</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Create Challenge'}
          </button>
        </div>
        <div style={{ padding: '0 16px 16px 16px' }}>
          <input
            type="text"
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              width: '100%',
              maxWidth: '400px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {showConfirmation && ReactDOM.createPortal(
        <div className="challenge-detail-modal-backdrop" style={{ zIndex: 10001 }}>
          <div className="challenge-detail-modal" style={{ maxWidth: '400px' }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                Unsaved Changes
              </h3>
            </div>
            <div style={{ padding: '24px', color: '#666' }}>
              <p>You have unsaved changes. Do you want to discard them?</p>
            </div>
            <div style={{
              padding: '24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              backgroundColor: '#f9fafb'
            }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowConfirmation(false)}
              >
                Keep Editing
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setEditingId(null);
                  setShowConfirmation(false);
                }}
                style={{ backgroundColor: '#ef4444' }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>,
        portalElement
      )}

      {showForm && ReactDOM.createPortal(
        <div className="challenge-detail-modal-backdrop" onClick={handleBackdropClick} style={{ zIndex: 10000 }}>
          <div className="challenge-detail-modal" style={{ maxWidth: '900px' }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                {editingId ? 'Edit Challenge' : 'Create New Challenge'}
              </h3>
              <button
                onClick={handleCloseForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1f2937'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
                title="Close modal (ESC)"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1
            }}>
              <ChallengeForm 
                formData={formData} 
                setFormData={setFormData} 
                fieldErrors={fieldErrors}
              />
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  Resources
                </h4>
                <ResourceUploader 
                  formData={formData} 
                  setFormData={setFormData} 
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              backgroundColor: '#f9fafb'
            }}>
              <button 
                className="btn btn-ghost" 
                onClick={handleCloseForm}
                disabled={loading}
              >
                Cancel
              </button>
              <ActionButton
                onClick={saveChallenge}
                isLoading={loading}
                icon={editingId ? FaPencil : FaPlus}
                variant={editingId ? 'primary' : 'success'}
                loadingText={editingId ? 'Updating...' : 'Creating...'}
                size="md"
              >
                {editingId ? 'Update Challenge' : 'Create Challenge'}
              </ActionButton>
            </div>
          </div>
        </div>,
        portalElement
      )}

      <div style={{ flexShrink: 0 }}>
        <ChallengesFilters
          challenges={challenges}
          filterCategory={filterCategory}
          filterDifficulty={filterDifficulty}
          filterStatus={filterStatus}
          onCategoryChange={setFilterCategory}
          onDifficultyChange={setFilterDifficulty}
          onStatusChange={setFilterStatus}
          onClearFilters={() => { setFilterCategory(''); setFilterDifficulty(''); setFilterStatus(''); }}
        />
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
      }}>
        <ChallengesList
          challenges={challenges}
          searchQuery={searchQuery}
          filterCategory={filterCategory}
          filterDifficulty={filterDifficulty}
          filterStatus={filterStatus}
          onEdit={editChallenge}
          onDelete={deleteChallenge}
          onViewDetail={(challenge) => { setSelectedChallenge(challenge); setShowDetailModal(true); }}
          loading={loading}
        />
      </div>

      {showDetailModal && selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onEdit={editChallenge}
          onDelete={deleteChallenge}
          onMaintenance={handleMaintenance}
          onRemove={deleteChallenge}
          onClose={() => { setShowDetailModal(false); setSelectedChallenge(null); }}
        />
      )}
    </div>
  );
};

export default CompetitionChallengeUploader;
