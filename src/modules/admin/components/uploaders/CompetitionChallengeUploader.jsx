import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { apiCall } from '../../../../utils/api';
import NotificationModal from '../../../../common/NotificationModal';
import ActionButton from '../../../../common/ActionButton';
import ChallengeDetailModal from '../challenge-management/ChallengeDetailModal';
import { ChallengeForm, ResourceUploader, ChallengesFilters, ChallengesList, useChallengeForm } from '../competition-uploader';
import { FaPlus, FaPencil } from '../../../../utils/icons';
import './CompetitionChallengeUploader.css';

const normalizeTitle = value => String(value || '').trim().toLowerCase();

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
      formData.difficulty !== defaultValues.difficulty ||
      formData.points !== defaultValues.points ||
      formData.description !== defaultValues.description ||
      formData.flag !== defaultValues.flag ||
      (Array.isArray(formData.resources) && formData.resources.length > 0) ||
      (Array.isArray(formData.hints) && formData.hints.some(h => String(h || '').trim()))
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

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add('modal-active');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = scrollBarWidth > 0 ? `${scrollBarWidth}px` : '';

    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.classList.remove('modal-active');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = "";
      document.body.style.paddingRight = '';
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showForm, handleCloseForm]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCloseForm();
    }
  };

  const duplicateTitleChallenge = useMemo(() => {
    const normalizedTitle = normalizeTitle(formData.title);

    if (!normalizedTitle) {
      return null;
    }

    return challenges.find(challenge => (
      challenge.id !== editingId
      && normalizeTitle(challenge.title) === normalizedTitle
    )) || null;
  }, [challenges, editingId, formData.title]);

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

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      // Build error message for specific empty fields
      const errorFields = [];
      if (validationErrors.title) errorFields.push('Title');
      if (validationErrors.category_id) errorFields.push('Category');
      if (validationErrors.difficulty) errorFields.push('Difficulty');
      if (validationErrors.points) errorFields.push('Points');
      if (validationErrors.flag) errorFields.push('Flag');
      if (validationErrors.description) errorFields.push('Description');

      const errorMsg = `Please fill in: ${errorFields.join(', ')}`;
      showResult(errorMsg, false);
      return;
    }

    if (duplicateTitleChallenge) {
      showResult('A challenge with this title already exists. Please use a different title.', false);
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
      <NotificationModal notification={notification} onDismiss={handleDismissNotification} duration={3000} />

      <div className="uploader-header">
        <div className="uploader-header-top">
          <h2 className="uploader-title">CyberCom Challenges</h2>
          <button
            className="btn btn-primary uploader-header-action"
            onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
          >
            {showForm ? 'Cancel' : '+ Create Challenge'}
          </button>
        </div>
        <div className="uploader-header-search">
          <input
            className="uploader-search-input"
            type="text"
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="challenge-form-modal-footer">
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
        <div className="challenge-detail-modal-backdrop challenge-form-modal-backdrop" onClick={handleBackdropClick} style={{ zIndex: 10000 }}>
          <div className="challenge-detail-modal challenge-form-modal">
            {/* Modal Header */}
            <div className="challenge-form-modal-header">
              <h3 className="challenge-form-modal-title">
                {editingId ? 'Edit Challenge' : 'Create New Challenge'}
              </h3>
              <button
                className="challenge-form-modal-close"
                onClick={handleCloseForm}
                title="Close modal (ESC)"
              >
                ×
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="challenge-form-modal-body">
              <ChallengeForm 
                formData={formData} 
                setFormData={setFormData} 
                fieldErrors={fieldErrors}
                titleConflict={duplicateTitleChallenge}
              />
              <div className="challenge-form-resources">
                <h4 className="challenge-form-resources-title">
                  Resources
                </h4>
                <ResourceUploader 
                  formData={formData} 
                  setFormData={setFormData} 
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="challenge-form-modal-footer">
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
                disabled={Boolean(duplicateTitleChallenge)}
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
