import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiDelete, API_ENDPOINTS } from '../../../../utils/api';
import { CATEGORY_NAMES, CATEGORIES, DIFFICULTIES } from '../../../../utils/constants';
import NotificationModal from '../../../../common/NotificationModal';
import { useExpandableCards, ChallengesGrid } from '../challenge-selector';
import AddChallengesModal from './AddChallengesModal';
import './ChallengeSelector.css';

const ChallengeSelector = ({
  competitionId = null,
  competitionName = '',
}) => {
  const [allChallenges, setAllChallenges] = useState([]);
  const [assignedChallenges, setAssignedChallenges] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedChallengesToAdd, setSelectedChallengesToAdd] = useState(new Set());
  const [removingChallengeId, setRemovingChallengeId] = useState(null);
  
  const { expandedCardId, toggleCardExpansion } = useExpandableCards();
  const [notification, setNotification] = useState(null);
  const showResult = useCallback((message, isSuccess) => {
    setNotification({
      type: isSuccess ? 'success' : 'error',
      title: isSuccess ? 'Success' : 'Error',
      message,
    });
  }, []);

  const fetchAllChallenges = useCallback(async () => {
    try {
      const response = await apiGet(API_ENDPOINTS.CHALLENGES_LIST);
      if (response.success) {
        setAllChallenges(response.data || []);
      } else {
        showResult('Failed to load challenges', false);
      }
    } catch (_error) {
      showResult('Failed to load challenges', false);
    }
  }, [showResult]);

  const fetchAssignedChallenges = useCallback(async (competitionId) => {
    if (!competitionId) return;
    
    try {
      const response = await apiGet(
        API_ENDPOINTS.ADMIN_COMPETITION_CHALLENGES_LIST(competitionId)
      );
      if (response.success) {
        // Backend now sends pre-decrypted challenges
        setAssignedChallenges(response.data || []);
      } else {
        showResult('Failed to load assigned challenges', false);
      }
    } catch (_error) {
      showResult('Failed to load assigned challenges', false);
    }
  }, [showResult]);

  // Fetch all challenges on mount
  useEffect(() => {
    fetchAllChallenges();
  }, [fetchAllChallenges]);

  // Fetch assigned challenges when the selected competition changes
  useEffect(() => {
    if (competitionId) {
      fetchAssignedChallenges(competitionId);
    } else {
      setAssignedChallenges([]);
    }
  }, [competitionId, fetchAssignedChallenges]);

  const handleRemoveChallenge = async (challenge) => {
    // Prevent multiple rapid clicks
    if (removingChallengeId === challenge.id) {
      return;
    }

    setRemovingChallengeId(challenge.id);
    
    try {
      const response = await apiDelete(
        API_ENDPOINTS.ADMIN_COMPETITION_REMOVE_CHALLENGE(competitionId, challenge.id)
      );
      
      if (response.success) {
        showResult('Challenge removed successfully', true);
        await fetchAssignedChallenges(competitionId);
      } else {
        showResult(response.message || 'Failed to remove challenge', false);
      }
    } catch (_error) {
      showResult('Error removing challenge', false);
    } finally {
      setRemovingChallengeId(null);
    }
  };

  // Compute available challenges
  const assignedIds = new Set(assignedChallenges.map(c => c.id));
  const availableChallenges = allChallenges.filter(c => {
    if (assignedIds.has(c.id)) return false;
    // Filter out under_maintenance challenges (case-insensitive)
    if (c.status && c.status.toString().toLowerCase().trim() === 'under_maintenance') return false;
    return true;
  });

  // Filter by search query, category, and difficulty
  const applyFilters = (challenges) => {
    return challenges.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || c.category_id === parseInt(categoryFilter);
      const matchesDifficulty = !difficultyFilter || c.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  };

  // Filter assigned challenges to remove under_maintenance challenges
  const cleanedAssignedChallenges = assignedChallenges.filter(c => {
    // Filter out under_maintenance challenges (case-insensitive)
    if (c.status && c.status.toString().toLowerCase().trim() === 'under_maintenance') return false;
    return true;
  });

  const filteredAvailable = applyFilters(availableChallenges);
  const filteredAssigned = applyFilters(cleanedAssignedChallenges);

  // Stable callback for dismissing notifications
  const handleDismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return (
    <>
      <NotificationModal notification={notification} onDismiss={handleDismissNotification} duration={3000} />
      
      <div className="challenge-selector">
        <div className="selector-header">
          <h2>Challenge Selector</h2>
          <p>
            {competitionName
              ? `Assign challenges to ${competitionName}`
              : 'Assign challenges to the selected competition'}
          </p>
        </div>

        {!competitionId ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666', backgroundColor: '#f5f5f5', borderRadius: '8px', marginTop: '16px' }}>
            <p>Select a competition from the competition submenu to manage its challenge set.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '200px' }}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Difficulties</option>
                {DIFFICULTIES.map(diff => (
                  <option key={diff.id} value={diff.id}>{diff.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}
              >
                + Add Challenge
              </button>
            </div>

            <ChallengesGrid
              title="Assigned Challenges"
              challenges={filteredAssigned}
              expandedCardId={expandedCardId}
              onToggleExpansion={toggleCardExpansion}
              onCardAction={handleRemoveChallenge}
              actionType="remove"
              categoryNames={CATEGORY_NAMES}
              isLoading={removingChallengeId}
            />
          </>
        )}

        <AddChallengesModal
          showModal={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedChallengesToAdd(new Set());
            // Refresh assigned challenges to update available list
            if (competitionId) {
              fetchAssignedChallenges(competitionId);
            }
          }}
          availableChallenges={filteredAvailable}
          selectedChallenges={selectedChallengesToAdd}
          onSelectionChange={setSelectedChallengesToAdd}
          competitionId={competitionId}
          competitionName={competitionName}
          onSuccess={showResult}
          onError={(msg) => showResult(msg, false)}
        />
      </div>
    </>
  );
};

export default ChallengeSelector;
