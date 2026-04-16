/**
 * API Configuration and Helper Functions
 * Centralized API endpoint management
 */

// API Base URL - Uses relative path (proxied through Vite)
// In development: Vite proxies /api to http://localhost:3000/api
// In production: Configure as needed for your deployment
export const API_BASE_URL = '/api';
const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_LOGOUT_ENDPOINT = '/logout/admin';
const DEFAULT_ADMIN_TOKEN_TTL_MS = 60 * 60 * 1000;
const COMPETITION_ACCESS_REVOKED_ERROR_CODE = 'competition_access_revoked';
export const DATABASE_STATUS_EVENT = 'database-status-change';
export const DATABASE_UNAVAILABLE_MESSAGE = 'Database unavailable. Please try again shortly.';
export const PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE
  = 'Competition system is temporarily unavailable. Please wait for the admin.';

const isAdminEndpoint = endpoint =>
  endpoint.startsWith('/admin') || endpoint === ADMIN_LOGOUT_ENDPOINT;
const isCompetitionSessionEndpoint = endpoint =>
  endpoint.startsWith('/competition/live-monitor')
  || endpoint.startsWith('/teams/heartbeat')
  || endpoint.startsWith('/teams/member/confirm-online')
  || endpoint.startsWith('/submissions')
  || endpoint.startsWith('/competitions/');
const isCompetitionClientRoute = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const pathname = window.location.pathname || '';

  return pathname.includes('/competition/dashboard') || pathname.includes('/competition/login');
};

const shouldMaskServiceUnavailableForParticipant = (endpoint, status) => (
  status === 503
  && isCompetitionClientRoute()
  && !isAdminEndpoint(endpoint)
);
const isBrowserOffline = () => (
  typeof navigator !== 'undefined' && navigator.onLine === false
);
const isTransientFetchFailure = error => {
  if (!error) {
    return false;
  }

  const message = typeof error?.message === 'string' ? error.message : String(error);

  return error?.name === 'TypeError'
    && /failed to fetch|networkerror|load failed/i.test(message);
};

const parseStoredJson = (value, scope) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    console.warn(`[API] Failed to parse ${scope}`);

    return null;
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem('adminSession');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminTokenExpires');
};

const isExpired = expiresAt => {
  if (!expiresAt) {
    return false;
  }

  const expiryTime = Date.parse(expiresAt);

  return Number.isFinite(expiryTime) && expiryTime <= Date.now();
};

export const parseExpiresInMs = expiresIn => {
  if (typeof expiresIn === 'number') {
    return expiresIn > 1000 ? expiresIn : expiresIn * 1000;
  }

  if (typeof expiresIn !== 'string') {
    return DEFAULT_ADMIN_TOKEN_TTL_MS;
  }

  const normalized = expiresIn.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([smhd])$/);

  if (!match) {
    return DEFAULT_ADMIN_TOKEN_TTL_MS;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

export const getAdminToken = () => {
  const expiresAt = localStorage.getItem('adminTokenExpires');

  if (isExpired(expiresAt)) {
    clearAdminAuth();
    console.warn('[API] Admin token expired, clearing admin session');

    return null;
  }

  const adminToken = localStorage.getItem('adminToken');

  if (adminToken) {
    return adminToken;
  }

  const session = parseStoredJson(localStorage.getItem('adminSession'), 'adminSession');

  return session?.token || null;
};

export const getCompetitionSessionToken = () => {
  const session = parseStoredJson(localStorage.getItem('competitionSession'), 'competitionSession');

  return session?.sessionToken || null;
};

const emitCompetitionAccessRevoked = message => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('competition-access-revoked', {
    detail: {
      message: message || 'Your competition access was revoked.',
    },
  }));
};
const emitDatabaseStatusChange = detail => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(DATABASE_STATUS_EVENT, {
    detail,
  }));
};

export const hasValidAdminSession = () => {
  const session = parseStoredJson(localStorage.getItem('adminSession'), 'adminSession');

  return !!session && !!getAdminToken();
};

/**
 * Get authentication token from localStorage
 * Checks multiple keys for different user types
 * @returns {string|null} - The authentication token or null
 */
export const getAuthToken = endpoint => {
  if (isAdminEndpoint(endpoint)) {
    return getAdminToken();
  }

  const token
    = getAdminToken()
      || localStorage.getItem('token')
      || localStorage.getItem('authToken');

  if (!token && typeof window !== 'undefined') {
    console.warn('[API] No authentication token found in localStorage');
  }

  return token;
};

/**
 * Make an API request with proper error handling
 * @param {string} endpoint - The API endpoint (e.g., '/submissions', '/challenges')
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const adminToken = getAdminToken();
  const competitionToken = getCompetitionSessionToken();

  // Retrieve the authentication token from localStorage
  const token = getAuthToken(endpoint);

  // Merge headers properly
  const headers = {
    'Content-Type': 'application/json',
    ...(adminToken && { 'x-admin-token': adminToken }),
    ...(competitionToken && isCompetitionClientRoute() && isCompetitionSessionEndpoint(endpoint)
      ? { 'x-competition-token': competitionToken }
      : {}),
    ...(options.headers || {}),
  };

  if (token && isAdminEndpoint(endpoint)) {
    console.debug('[API] Token found, adding to x-admin-token header');
  }

  if (isBrowserOffline()) {
    const offlineError = new Error('Browser is offline');
    offlineError.name = 'NetworkRequestError';
    offlineError.code = 'NETWORK_OFFLINE';
    offlineError.isNetworkError = true;
    offlineError.isTransientNetworkError = true;
    throw offlineError;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  } catch (error) {
    if (isTransientFetchFailure(error)) {
      const networkError = new Error('Request interrupted by a network change');
      networkError.name = 'NetworkRequestError';
      networkError.code = isBrowserOffline() ? 'NETWORK_OFFLINE' : 'NETWORK_CHANGED';
      networkError.isNetworkError = true;
      networkError.isTransientNetworkError = true;
      networkError.cause = error;
      console.warn(`[API] Transient network error on ${endpoint}`);
      throw networkError;
    }

    console.error('[API] Fetch error:', error);
    throw error;
  }
};

/**
 * Make an API request and parse JSON response
 * @param {string} endpoint - The API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Parsed JSON response
 */
export const apiRequest = async (endpoint, options = {}) => {
  const response = await apiCall(endpoint, options);
  let data = {};

  try {
    data = await response.json();
  } catch (e) {
    console.error(`[API] Failed to parse JSON from ${endpoint}:`, e);

    // Attempt to read the raw response body for debugging (useful for 500s
    // that return an empty or non-JSON body).
    let rawText = null;
    try {
      rawText = await response.text();
      console.error(`[API] Raw response body from ${endpoint} (status ${response.status}):`, rawText);
    } catch (textErr) {
      console.error(`[API] Failed to read raw response text from ${endpoint}:`, textErr);
    }

    data = { _raw: rawText, _parseError: e?.message || String(e) };
  }

  if (response.status === 401 && isAdminEndpoint(endpoint)) {
    clearAdminAuth();

    if (typeof window !== 'undefined' && window.location.pathname !== ADMIN_LOGIN_PATH) {
      window.location.replace(ADMIN_LOGIN_PATH);
    }
  }

  if (!response.ok) {
    if (data.errorCode === COMPETITION_ACCESS_REVOKED_ERROR_CODE) {
      emitCompetitionAccessRevoked(data.error);
    }

    const errorMsg = response.status === 503
      ? (
        shouldMaskServiceUnavailableForParticipant(endpoint, response.status)
          ? PARTICIPANT_SERVICE_UNAVAILABLE_MESSAGE
          : (data.error || DATABASE_UNAVAILABLE_MESSAGE)
      )
      : (data.error || `HTTP ${response.status}`);

    if (response.status === 503) {
      emitDatabaseStatusChange({
        available: false,
        message: DATABASE_UNAVAILABLE_MESSAGE,
      });
    }

    const fullError = `API Error [${response.status}] ${endpoint}: ${errorMsg}`;
    const error = new Error(fullError);
    error.status = response.status;
    error.data = data;
    console.error('[API]', fullError);
    throw error;
  }

  emitDatabaseStatusChange({ available: true });

  return data;
};

/**
 * Make a GET request
 * @param {string} endpoint - The API endpoint
 * @returns {Promise<object>} - Parsed JSON response
 */
export const apiGet = (endpoint, options = {}) => {
  return apiRequest(endpoint, {
    method: 'GET',
    ...options,
  });
};

/**
 * Make a POST request
 * @param {string} endpoint - The API endpoint
 * @param {object} data - Request body data
 * @returns {Promise<object>} - Parsed JSON response
 */
export const apiPost = (endpoint, data = {}) => {
  return apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Make a PUT request
 * @param {string} endpoint - The API endpoint
 * @param {object} data - Request body data
 * @returns {Promise<object>} - Parsed JSON response
 */
export const apiPut = (endpoint, data = {}) => {
  return apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Make a DELETE request
 * @param {string} endpoint - The API endpoint
 * @returns {Promise<object>} - Parsed JSON response
 */
export const apiDelete = (endpoint) => {
  return apiRequest(endpoint, {
    method: 'DELETE',
  });
};

// API Endpoints (for reference)
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN_ADMIN: '/login/admin',
  AUTH_LOGIN_TEAM: '/login/team',
  AUTH_LOGIN_USER: '/login/user',
  AUTH_LOGIN_PRACTICE: '/login/practice',
  AUTH_LOGIN_COMPETITION: '/login/competition',
  AUTH_LOGOUT_COMPETITION: '/logout/competition',
  AUTH_LOGOUT_ADMIN: '/logout/admin',
  AUTH_REGISTER_USER: '/register/user',
  AUTH_REGISTER_PRACTICE: '/register/practice',
  AUTH_REGISTER_TEAM: '/register/team',

  // Challenges
  CHALLENGES_LIST: '/challenges',
  CHALLENGES_DETAIL: (id) => `/challenges/${id}`,
  CHALLENGES_CATEGORIES: '/categories',
  CHALLENGES_CREATE: '/challenges',
  CHALLENGES_UPDATE: (id) => `/challenges/${id}`,
  CHALLENGES_DELETE: (id) => `/challenges/${id}`,

  // Teams
  TEAMS_LIST: '/teams',
  TEAMS_DETAIL: (id) => `/teams/${id}`,
  TEAMS_MEMBERS: (id) => `/teams/${id}/members`,
  TEAMS_CREATE: '/teams',
  TEAMS_UPDATE: (id) => `/teams/${id}`,
  TEAMS_DELETE: (id) => `/teams/${id}`,
  TEAMS_LINK_COMPETITION: (id) => `/teams/${id}/link-competition`,
  TEAMS_MEMBER_UPDATE: (teamId, memberId) => `/teams/${teamId}/members/${memberId}`,
  TEAMS_MEMBER_RESET_PASSWORD: (teamId, memberId) => `/teams/${teamId}/members/${memberId}/reset-password`,
  TEAMS_MEMBER_DELETE: (teamId, memberId) => `/teams/${teamId}/members/${memberId}`,

  // Competitions
  COMPETITIONS_LIST: '/competitions',
  COMPETITIONS_DETAIL: (id) => `/competitions/${id}`,
  COMPETITIONS_CHALLENGES: (id) => `/competitions/${id}/challenges`,
  COMPETITIONS_TEAMS: (id) => `/competitions/${id}/teams`,
  COMPETITIONS_RANKINGS: (id) => `/competitions/${id}/rankings`,
  COMPETITIONS_CREATE: '/competitions',
  COMPETITIONS_UPDATE: (id) => `/competitions/${id}`,
  COMPETITIONS_DELETE: (id) => `/competitions/${id}`,

  // Rules
  RULES_LIST: (type) => `/rules/${type}`,
  ADMIN_RULES_UPDATE: (type) => `/admin/rules/${type}`,
  ADMIN_RULES_RESET: (type) => `/admin/rules/${type}/reset`,

  // Submissions
  SUBMISSIONS_LIST: '/submissions',
  SUBMISSIONS_BY_TEAM: (teamId) => `/teams/${teamId}/submissions`,
  SUBMISSIONS_TEAM_SCORE: (teamId) => `/teams/${teamId}/score`,
  SUBMISSIONS_CREATE: '/submissions',
  SUBMISSIONS_LEADERBOARD: (competitionId) =>
    `/competitions/${competitionId}/leaderboard`,

  // Admin
  ADMIN_STATS: '/admin/stats',
  ADMIN_USERS_LIST: '/admin/users',
  ADMIN_PRACTICE_USERS_LIST: '/admin/practice-users',
  ADMIN_USER_ROLE: (id) => `/admin/users/${id}/role`,
  ADMIN_USER_STATUS: (id) => `/admin/users/${id}/status`,
  ADMIN_COMPETITION_ADD_CHALLENGE: (competitionId) =>
    `/admin/competitions/${competitionId}/challenges`,
  ADMIN_COMPETITION_REMOVE_CHALLENGE: (competitionId, challengeId) =>
    `/admin/competitions/${competitionId}/challenges/${challengeId}`,
  ADMIN_COMPETITION_UPDATE_CHALLENGE_POINTS: (competitionId, challengeId) =>
    `/admin/competitions/${competitionId}/challenges/${challengeId}`,
  ADMIN_LIVE_MONITOR_PARTICIPANTS: '/admin/live-monitor/participants',
  ADMIN_LIVE_MONITOR_SCREEN_SHARE: memberId => `/admin/live-monitor/screen-share/${memberId}`,
  ADMIN_LIVE_MONITOR_SCREEN_SHARES: '/admin/live-monitor/screen-shares',
  ADMIN_LIVE_MONITOR_HISTORY: memberId => `/admin/live-monitor/history/${memberId}`,
  ADMIN_TEAM_MEMBER_DISQUALIFY: memberId => `/admin/team-members/${memberId}/disqualify`,
  ADMIN_LOGS: '/admin/logs',

  COMPETITION_LIVE_MONITOR_ACTIVITY: '/competition/live-monitor/activity',
  COMPETITION_SCREEN_SHARE_START: '/competition/live-monitor/screen-share/start',
  COMPETITION_SCREEN_SHARE_FRAME: '/competition/live-monitor/screen-share/frame',
  COMPETITION_SCREEN_SHARE_STOP: '/competition/live-monitor/screen-share/stop',
};
