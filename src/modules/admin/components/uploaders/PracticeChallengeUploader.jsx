import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPut, API_ENDPOINTS } from '../../../../utils/api';
import {
  CATEGORY_ID_TO_KEY,
  CATEGORY_NAMES,
  CATEGORIES,
  DIFFICULTIES,
} from '../../../../utils/constants';
import NotificationModal from '../../../../common/NotificationModal';
import PracticePoolModal from '../challenge-management/PracticePoolModal';
import '../challenge-management/ChallengeSelector.css';
import './PracticeChallengeUploader.css';

const DIFFICULTY_NAMES = Object.fromEntries(
  DIFFICULTIES.map(({ id, name }) => [id, name])
);

const getChallengeList = response => {
  const normalizeChallenge = challenge => ({
    ...challenge,
    category_id: challenge.category_id ?? challenge.categoryId ?? null,
  });

  if (Array.isArray(response)) {
    return response.map(normalizeChallenge);
  }

  if (Array.isArray(response?.data)) {
    return response.data.map(normalizeChallenge);
  }

  if (Array.isArray(response?.challenges)) {
    return response.challenges.map(normalizeChallenge);
  }

  return [];
};

const getUserList = response => {
  const normalizeUser = user => ({
    ...user,
    created_at: user.created_at ?? user.createdAt ?? null,
    status: user.status ?? 'active',
  });

  if (Array.isArray(response)) {
    return response.map(normalizeUser);
  }

  if (Array.isArray(response?.data)) {
    return response.data.map(normalizeUser);
  }

  if (Array.isArray(response?.users)) {
    return response.users.map(normalizeUser);
  }

  return [];
};

const normalizeText = value => String(value || '').trim().toLowerCase();

const formatDate = value => {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return parsedDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getCategoryLabel = challenge => {
  const categoryKey = CATEGORY_ID_TO_KEY[challenge.category_id]
    || normalizeText(challenge.category);

  return CATEGORY_NAMES[categoryKey] || challenge.category_name || 'Unknown';
};

const getDifficultyLabel = difficulty =>
  DIFFICULTY_NAMES[difficulty] || difficulty || 'Unknown';

const PracticeChallengeUploader = () => {
  const [allChallenges, setAllChallenges] = useState([]);
  const [practiceChallenges, setPracticeChallenges] = useState([]);
  const [practiceUsers, setPracticeUsers] = useState([]);
  const [challengeSearchQuery, setChallengeSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedChallengesToAdd, setSelectedChallengesToAdd] = useState(new Set());
  const [removingChallengeId, setRemovingChallengeId] = useState(null);
  const [isAddingChallenges, setIsAddingChallenges] = useState(false);
  const [isChallengesLoading, setIsChallengesLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);

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

  const loadChallenges = useCallback(async () => {
    setIsChallengesLoading(true);

    try {
      const [allResponse, practiceResponse] = await Promise.all([
        apiGet(API_ENDPOINTS.CHALLENGES_LIST),
        apiGet('/challenges?mode=practice'),
      ]);

      setAllChallenges(getChallengeList(allResponse));
      setPracticeChallenges(getChallengeList(practiceResponse));
    } catch (_error) {
      showResult('Failed to load practice challenge table', false);
    } finally {
      setIsChallengesLoading(false);
    }
  }, [showResult]);

  const loadUsers = useCallback(async () => {
    setIsUsersLoading(true);

    try {
      const response = await apiGet(API_ENDPOINTS.ADMIN_PRACTICE_USERS_LIST);
      setPracticeUsers(getUserList(response));
    } catch (_error) {
      showResult('Failed to load practice signup users', false);
    } finally {
      setIsUsersLoading(false);
    }
  }, [showResult]);

  const refreshTables = useCallback(async () => {
    await Promise.all([loadChallenges(), loadUsers()]);
  }, [loadChallenges, loadUsers]);

  useEffect(() => {
    void refreshTables();
  }, [refreshTables]);

  const applyChallengeFilters = useCallback(challenges => {
    const normalizedSearch = normalizeText(challengeSearchQuery);

    return challenges.filter(challenge => {
      const matchesSearch = !normalizedSearch
        || normalizeText(challenge.title).includes(normalizedSearch)
        || normalizeText(challenge.description).includes(normalizedSearch);
      const matchesCategory = !categoryFilter
        || challenge.category_id === Number.parseInt(categoryFilter, 10);
      const matchesDifficulty = !difficultyFilter
        || challenge.difficulty === difficultyFilter;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [categoryFilter, challengeSearchQuery, difficultyFilter]);

  const practiceChallengeIds = useMemo(
    () => new Set(practiceChallenges.map(challenge => challenge.id)),
    [practiceChallenges]
  );

  const availableChallenges = useMemo(() => (
    allChallenges.filter(challenge => {
      if (practiceChallengeIds.has(challenge.id)) {
        return false;
      }

      return normalizeText(challenge.status) !== 'under_maintenance';
    })
  ), [allChallenges, practiceChallengeIds]);

  const visiblePracticeChallenges = useMemo(() => (
    practiceChallenges.filter(
      challenge => normalizeText(challenge.status) !== 'under_maintenance'
    )
  ), [practiceChallenges]);

  const filteredAvailableChallenges = useMemo(
    () => applyChallengeFilters(availableChallenges),
    [applyChallengeFilters, availableChallenges]
  );

  const filteredPracticeChallenges = useMemo(
    () => applyChallengeFilters(visiblePracticeChallenges),
    [applyChallengeFilters, visiblePracticeChallenges]
  );

  const filteredPracticeUsers = useMemo(() => {
    const normalizedSearch = normalizeText(userSearchQuery);

    return practiceUsers.filter(user => (
      !normalizedSearch
      || normalizeText(user.username).includes(normalizedSearch)
      || normalizeText(user.email).includes(normalizedSearch)
      || normalizeText(user.status).includes(normalizedSearch)
    ));
  }, [practiceUsers, userSearchQuery]);

  const handleRemoveChallenge = async challenge => {
    if (removingChallengeId === challenge.id) {
      return;
    }

    setRemovingChallengeId(challenge.id);

    try {
      await apiPut(API_ENDPOINTS.CHALLENGES_UPDATE(challenge.id), { mode: 'competition' });
      showResult('Challenge removed from practice pool', true);
      await loadChallenges();
    } catch (_error) {
      showResult('Failed to remove challenge from practice pool', false);
    } finally {
      setRemovingChallengeId(null);
    }
  };

  const handleAddSelectedChallenges = async () => {
    if (selectedChallengesToAdd.size === 0) {
      showResult('Please select at least one challenge', false);
      return;
    }

    setIsAddingChallenges(true);

    const selectedIds = Array.from(selectedChallengesToAdd);
    const results = await Promise.allSettled(
      selectedIds.map(challengeId => apiPut(
        API_ENDPOINTS.CHALLENGES_UPDATE(challengeId),
        { mode: 'practice' }
      ))
    );

    const successCount = results.filter(
      resultItem => resultItem.status === 'fulfilled'
    ).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      showResult(
        failCount > 0
          ? `${successCount} challenge(s) added to practice. ${failCount} failed.`
          : `${successCount} challenge(s) added to practice pool`,
        failCount === 0
      );
    } else {
      showResult('Failed to add selected challenges to practice pool', false);
    }

    await loadChallenges();
    setIsAddingChallenges(false);

    if (successCount > 0) {
      setSelectedChallengesToAdd(new Set());
      setShowModal(false);
    }
  };

  const challengeEmptyMessage = visiblePracticeChallenges.length === 0
    ? 'No practice challenges added yet.'
    : 'No practice challenges match the current filters.';
  const userEmptyMessage = practiceUsers.length === 0
    ? 'No signed-up practice users found.'
    : 'No practice users match the current search.';

  return (
    <>
      <NotificationModal
        notification={notification}
        onDismiss={handleDismissNotification}
        duration={3000}
      />

      <div className="challenge-selector practice-uploader-shell">
        <div className="selector-header practice-uploader-header">
          <div>
            <h2>Practice Admin Tables</h2>
            <p>
              Manage practice challenges and review signed-up practice users.
              Competition points are not shown or assigned here.
            </p>
          </div>
          <button
            className="practice-uploader-secondary-btn"
            onClick={() => {
              void refreshTables();
            }}
            type="button"
          >
            Refresh Tables
          </button>
        </div>

        <div className="practice-uploader-stats">
          <div className="practice-uploader-stat-card">
            <span className="practice-uploader-stat-label">Practice Challenges</span>
            <strong>{visiblePracticeChallenges.length}</strong>
          </div>
          <div className="practice-uploader-stat-card">
            <span className="practice-uploader-stat-label">Available to Add</span>
            <strong>{availableChallenges.length}</strong>
          </div>
          <div className="practice-uploader-stat-card">
            <span className="practice-uploader-stat-label">Signed-up Practice Users</span>
            <strong>{practiceUsers.length}</strong>
          </div>
        </div>

        <section className="practice-uploader-section">
          <div className="practice-uploader-section-header">
            <div>
              <h3>Practice Challenges</h3>
              <p>Table view for the practice pool. Points are intentionally hidden.</p>
            </div>
            <button
              className="practice-uploader-primary-btn"
              onClick={() => setShowModal(true)}
              type="button"
            >
              Add Challenge
            </button>
          </div>

          <div className="practice-uploader-controls">
            <input
              type="text"
              className="form-input practice-uploader-search-input"
              placeholder="Search challenge title or description"
              value={challengeSearchQuery}
              onChange={event => setChallengeSearchQuery(event.target.value)}
            />
            <select
              className="practice-uploader-select"
              value={categoryFilter}
              onChange={event => setCategoryFilter(event.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="practice-uploader-select"
              value={difficultyFilter}
              onChange={event => setDifficultyFilter(event.target.value)}
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(difficulty => (
                <option key={difficulty.id} value={difficulty.id}>
                  {difficulty.name}
                </option>
              ))}
            </select>
          </div>

          {isChallengesLoading ? (
            <div className="practice-uploader-empty">Loading practice challenges...</div>
          ) : filteredPracticeChallenges.length === 0 ? (
            <div className="practice-uploader-empty">{challengeEmptyMessage}</div>
          ) : (
            <div className="practice-uploader-table-wrap table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPracticeChallenges.map(challenge => (
                    <tr key={challenge.id}>
                      <td className="bold">
                        <div className="practice-uploader-row-title">
                          {challenge.title || 'Untitled Challenge'}
                        </div>
                        <div className="practice-uploader-row-subtitle">
                          {challenge.description || 'No description provided'}
                        </div>
                      </td>
                      <td>
                        <span className="practice-uploader-badge practice-uploader-badge-category">
                          {getCategoryLabel(challenge)}
                        </span>
                      </td>
                      <td>
                        <span className={`practice-uploader-badge practice-uploader-badge-difficulty difficulty-${normalizeText(challenge.difficulty) || 'unknown'}`}>
                          {getDifficultyLabel(challenge.difficulty)}
                        </span>
                      </td>
                      <td>
                        <span className={`practice-uploader-badge practice-uploader-badge-status status-${normalizeText(challenge.status) || 'active'}`}>
                          {challenge.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="practice-uploader-action-btn practice-uploader-action-btn-danger"
                          disabled={removingChallengeId === challenge.id}
                          onClick={() => {
                            void handleRemoveChallenge(challenge);
                          }}
                          type="button"
                        >
                          {removingChallengeId === challenge.id
                            ? 'Removing...'
                            : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="practice-uploader-section">
          <div className="practice-uploader-section-header">
            <div>
              <h3>Practice Users That Signed Up</h3>
              <p>Read-only table of registered practice user accounts.</p>
            </div>
          </div>

          <div className="practice-uploader-controls practice-uploader-controls-compact">
            <input
              type="text"
              className="form-input practice-uploader-search-input"
              placeholder="Search username, email, or status"
              value={userSearchQuery}
              onChange={event => setUserSearchQuery(event.target.value)}
            />
          </div>

          {isUsersLoading ? (
            <div className="practice-uploader-empty">Loading practice users...</div>
          ) : filteredPracticeUsers.length === 0 ? (
            <div className="practice-uploader-empty">{userEmptyMessage}</div>
          ) : (
            <div className="practice-uploader-table-wrap table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPracticeUsers.map(user => (
                    <tr key={user.id}>
                      <td className="bold">{user.username || 'N/A'}</td>
                      <td>
                        <span className="practice-uploader-email-cell">
                          {user.email || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`practice-uploader-badge practice-uploader-badge-status status-${normalizeText(user.status) || 'active'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <PracticePoolModal
        showModal={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedChallengesToAdd(new Set());
        }}
        availableChallenges={filteredAvailableChallenges}
        selectedChallenges={selectedChallengesToAdd}
        onSelectionChange={setSelectedChallengesToAdd}
        onConfirm={handleAddSelectedChallenges}
        isLoading={isAddingChallenges}
      />
    </>
  );
};

export default PracticeChallengeUploader;
