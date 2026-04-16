import {
  BiSearch,
  BiLock,
  BiGlobe,
  BiFile,
  BiPlay,
  BiHelpCircle,
} from "./icons.js";

// Challenge Categories (must match database IDs and colors)
export const CATEGORIES = [
  { id: 1, name: "Web Exploitation", icon: BiGlobe, color: "web", hexColor: "#06b6d4" },
  { id: 2, name: "Cryptography", icon: BiLock, color: "crypto", hexColor: "#ec4899" },
  { id: 3, name: "Forensics", icon: BiSearch, color: "forensics", hexColor: "#8b5cf6" },
  { id: 4, name: "Reverse Engineering", icon: BiPlay, color: "reverse", hexColor: "#14b8a6" },
  { id: 5, name: "Binary Exploitation", icon: BiFile, color: "binary", hexColor: "#f97316" },
];

// Category Name Mappings (for forms and filters)
export const CATEGORY_NAMES = {
  reverse: 'Reverse Engineering',
  web: 'Web Exploitation',
  forensics: 'Forensics',
  binary: 'Binary Exploitation',
  crypto: 'Cryptography'
};

// Category ID to Key Mapping (API returns numeric IDs)
export const CATEGORY_ID_TO_KEY = {
  1: 'web',
  2: 'crypto',
  3: 'forensics',
  4: 'reverse',
  5: 'binary'
};

// Category Keys List (for dropdowns)
export const CATEGORY_KEYS = Object.keys(CATEGORY_NAMES);
// Example: ['reverse', 'web', 'forensics', 'binary', 'crypto']

// Difficulty Levels
export const DIFFICULTIES = [
  { id: "easy", name: "Easy", points: 100 },
  { id: "medium", name: "Medium", points: 200 },
  { id: "hard", name: "Hard", points: 300 },
];

// Challenge Status
export const CHALLENGE_STATUS = {
  UNSOLVED: "unsolved",
  SOLVED: "solved",
  IN_PROGRESS: "in_progress",
  LOCKED: "locked",
};

// User Roles
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
};

// Navigation Links
export const NAV_LINKS = [
  { path: "/", label: "Practice", requireAuth: false },
  { path: "/competition", label: "Competition", requireAuth: true },
  { path: "/leaderboard", label: "Leaderboard", requireAuth: false },
  { path: "/profile", label: "Profile", requireAuth: true },
  { path: "/admin", label: "Admin", requireAuth: true, adminOnly: true },
];
