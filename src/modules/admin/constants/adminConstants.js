/**
 * Admin Module Constants
 * Centralized constants for the admin module to avoid magic strings/numbers throughout the codebase
 */

// Tab/Page names
export const ADMIN_TABS = {
  OVERVIEW: "overview",
  CHALLENGES: "challenges",
  TEAMS: "teams",
  COMPETITIONS: "competitions",
  SCORING_SIMULATOR: "scoring-simulator",
  STATS: "stats",
};

// Challenge types
export const CHALLENGE_TYPES = {
  PRACTICE: "practice",
  COMPETITION: "competition",
};

// Challenge categories
export const CHALLENGE_CATEGORIES = [
  "web",
  "mobile",
  "crypto",
  "forensics",
  "reverse",
  "pwn",
  "misc",
];

// Challenge difficulty levels
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard", "expert"];

// Ranking types
export const RANKING_TYPES = {
  INDIVIDUAL: "individual",
  TEAM: "team",
};

// Competition statuses
export const COMPETITION_STATUS = {
  UPCOMING: "upcoming",
  ACTIVE: "active",
  PAUSED: "paused",
  DONE: "done",
  CANCELLED: "cancelled",
};

// Default form values
export const DEFAULT_CHALLENGE_FORM = {
  title: "",
  type: "practice",
  category: "web",
  difficulty: "easy",
  points: "",
  description: "",
};

export const DEFAULT_COMPETITION_FORM = {
  name: "",
  startDate: "",
  endDate: "",
  maxParticipants: "8",
  description: "",
  scoringSettings: {
    solverWeight: 0.80,
    timeWeight: 0.20,
    solverDecayConstant: 0.12,
    attemptPenaltyConstant: 0.05,
    minScoreFloor: 10
  }
};

export const DEFAULT_PAUSE_STATE = {
  minutes: "0",
  seconds: "30",
};

export const MAX_COMPETITION_DURATION_HOURS = 8;
export const MAX_COMPETITION_DURATION_MS = MAX_COMPETITION_DURATION_HOURS * 60 * 60 * 1000;

// Validation rules
export const VALIDATION_RULES = {
  MIN_CHALLENGE_TITLE_LENGTH: 3,
  MAX_CHALLENGE_TITLE_LENGTH: 100,
  MIN_POINTS: 10,
  MAX_POINTS: 1000,
  MIN_TEAM_SIZE: 1,
  MAX_TEAM_SIZE: 50,
};

// Local storage keys
export const STORAGE_KEYS = {
  PAUSE_START_TIME: "competitionPauseStartTime",
  PAUSE_DURATION: "competitionPauseDuration",
  ADMIN_SETTINGS: "adminSettings",
  ADMIN_THEME: "adminTheme",
};

// Modal types
export const MODAL_TYPES = {
  CREATE_CHALLENGE: "createChallenge",
  CREATE_COMPETITION: "createCompetition",
  MANAGE_CATEGORIES: "manageCategories",
  COMPETITION_SELECTION: "competitionSelection",
  CHALLENGE_DETAILS: "challengeDetails",
  PAUSE_DIALOG: "pauseDialog",
};

// Icons (Font Awesome classes)
export const ICONS = {
  CHECK: "circle-check",
  ERROR: "circle-xmark",
  EDIT: "pen",
  DELETE: "trash",
  ADD: "plus",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  PAUSE: "pause",
  PLAY: "play",
  STOP: "stop",
};

// API delay animations
export const ANIMATION_TIMINGS = {
  MODAL_OPEN: 300,
  MODAL_CLOSE: 200,
  FORM_SUBMIT: 1500,
  ALERT_DISPLAY: 5000,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};

// Upload file limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_EXTENSIONS: ["zip", "txt", "pdf", "jpg", "jpeg", "png"],
  MAX_BULK_UPLOAD_COUNT: 100,
};

// Messages
export const MESSAGES = {
  UPLOAD_SUCCESS: "Challenges uploaded successfully!",
  UPLOAD_ERROR: "Failed to upload challenges. Please try again.",
  DELETE_CONFIRMATION: "Are you sure you want to delete this item?",
  INVALID_FILE_TYPE: "Invalid file type. Please upload a valid file.",
  REQUIRED_FIELD: "This field is required.",
};
