// Challenge Categories
export const CATEGORIES = [
  { id: "forensics", name: "Forensics", icon: "🔍", color: "forensics" },
  { id: "crypto", name: "Cryptography", icon: "🔐", color: "crypto" },
  { id: "web", name: "Web Exploitation", icon: "🌐", color: "web" },
  { id: "binary", name: "Binary Exploitation", icon: "💾", color: "binary" },
  { id: "reverse", name: "Reverse Engineering", icon: "🔧", color: "reverse" },
  { id: "misc", name: "Miscellaneous", icon: "🎯", color: "misc" },
];

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
