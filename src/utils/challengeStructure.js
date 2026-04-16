/**
 * Challenge Data Structure Definition
 * Unified structure for both practice and competition challenges
 */

/**
 * Standard Challenge Structure (API Response)
 * 
 * @typedef {Object} Challenge
 * @property {number} id - Unique identifier
 * @property {string} title - Challenge title
 * @property {string} description - Challenge description (HTML/Markdown)
 * @property {number} categoryId - Category ID (1=Web, 2=Crypto, 3=Forensics, 4=Reverse, 5=Binary)
 * @property {string} difficulty - Difficulty level: 'easy', 'medium', 'hard'
 * @property {number} points - Points awarded for solving
 * @property {string} flag - The flag (encrypted/hashed on API)
 * @property {string} mode - 'practice' or 'competition'
 * @property {string} status - 'active', 'archived', 'draft'
 * @property {string[]} hints - Array of hint strings (optional)
 * @property {Object[]} resources - Array of resource objects (optional)
 *   @property {string} resources[].title - Resource title
 *   @property {string} resources[].url - Resource URL
 * @property {number} solveCount - Total number of solves (read-only)
 * @property {string} createdAt - ISO timestamp
 * @property {string} createdBy - Admin username who created it
 * @property {string} updatedAt - ISO timestamp (optional)
 */

/**
 * Challenge Display Structure (Frontend)
 * Additional fields computed from Challenge data
 */

/*
{
  // Standard API fields
  id, title, description, categoryId, difficulty, points, flag,
  mode, status, hints, resources, solveCount, createdAt, createdBy, updatedAt,
  
  // Computed frontend fields
  category: Category object (from CATEGORIES array)
  isSolved: boolean (from user submission data)
  userScore: number (from user submission data)
  personalBestTime: string (from user submission data)
}
*/

/**
 * Migration Notes:
 * 
 * BEFORE (Practice - localStorage):
 * {
 *   id: number (local counter),
 *   title, category, difficulty, points, description,
 *   hints: [], attachments: [],
 *   createdAt: date string,
 *   mode: 'practice', status: 'active'
 * }
 * 
 * AFTER (Both - API):
 * {
 *   id: number (database ID),
 *   title, categoryId, difficulty, points, description,
 *   flag, hints: [], resources: [],
 *   createdAt: ISO timestamp,
 *   createdBy: admin username,
 *   mode: 'practice'|'competition', status: 'active'|'draft'|'archived'
 * }
 * 
 * KEY CHANGES:
 * - category (string) → categoryId (number) - matches CATEGORIES array
 * - attachments (array) → resources (array of objects with title, url)
 * - localStorage → API endpoints
 * - Client-side ID generation → Database-managed IDs
 */

// API Endpoints for Practice Challenges
export const PRACTICE_CHALLENGE_ENDPOINTS = {
  LIST: '/challenges?mode=practice',
  DETAIL: (id) => `/challenges/${id}`,
  CREATE: '/challenges',
  UPDATE: (id) => `/challenges/${id}`,
  DELETE: (id) => `/challenges/${id}`,
  ADMIN_LIST: '/admin/challenges?mode=practice',
};

// Challenge Fields Mapping
export const CHALLENGE_FIELD_MAPPING = {
  practice: {
    category: 'categoryId',
    attachments: 'resources',
  },
  competition: {
    category: 'categoryId',
    attachments: 'resources',
  },
};

// Category ID to name mapping
export const CATEGORY_ID_MAP = {
  1: 'web',
  2: 'crypto',
  3: 'forensics',
  4: 'reverse',
  5: 'binary',
};

export const CATEGORY_NAME_TO_ID = {
  web: 1,
  crypto: 2,
  forensics: 3,
  reverse: 4,
  binary: 5,
};
