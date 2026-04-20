/**
 * Admin Sidebar Navigation Configuration
 * Defines the structure and items for the admin sidebar navigation
 */

import {
  FaHome,
  FaShieldAlt,
  FaTrophy,
  FaFlag,
  FaBook,
  FaTachometerAlt,
  FaCheckSquare,
  FaUsers,
  FaMedal,
  FaBroadcastTower,
  FaGavel,
  FaDumbbell,
  FaChartBar,
  FaUser,
  FaCalculator,
} from "react-icons/fa";

export const getAdminSidebarNavItems = (hasManageableCompetitions = false) => {
  const navItems = [
    {
      id: "overview",
      label: "Overview",
      icon: FaHome,
      submenu: false,
    },
    {
      id: "challenges",
      label: "Practice Challenges",
      icon: FaShieldAlt,
      submenu: false,
    },
    {
      id: "competitions",
      label: "Competitions",
      icon: FaTrophy,
      submenu: true,
      subItems: [
        { id: "competitions", label: "Overview", icon: FaTachometerAlt },
        ...(hasManageableCompetitions
          ? [
              { id: "select-challenges", label: "Select Challenges", icon: FaCheckSquare },
              { id: "team-accounts", label: "Team Accounts", icon: FaUsers },
              { id: "scoring-simulator", label: "Scoring Insights", icon: FaCalculator },
              { id: "rankings", label: "Rankings", icon: FaMedal },
              { id: "liveMonitor", label: "Live Monitor", icon: FaBroadcastTower },
            ]
          : []),
      ],
    },
    // Promote competition challenges to a top-level sidebar item
    {
      id: "competition-challenges",
      label: "CyberCom Challenge",
      icon: FaFlag,
      submenu: false,
    },
    {
      id: "rules",
      label: "Rules",
      icon: FaBook,
      submenu: true,
      subItems: [
        { id: "rules", label: "Competition", icon: FaGavel },
        { id: "practiceRules", label: "Practice", icon: FaDumbbell },
      ],
    },
    {
      id: "overall-rankings",
      label: "Overall Rankings",
      icon: FaChartBar,
      submenu: true,
      subItems: [
        { id: "overallCompetitionRankings", label: "Competition", icon: FaTrophy },
        { id: "overallPracticeRankings",    label: "Practice",    icon: FaUser },
      ],
    },
  ];

  return navItems;
};

/**
 * Get a specific nav item by ID
 * @param {string} id - The nav item ID
 * @param {boolean} hasManageableCompetitions - Whether non-terminal competitions are available
 * @returns {object|null} - The nav item or null if not found
 */
export const getNavItemById = (id, hasManageableCompetitions = false) => {
  const items = getAdminSidebarNavItems(hasManageableCompetitions);
  return items.find((item) => item.id === id) || null;
};

/**
 * Get all submenu items for a parent nav item
 * @param {string} parentId - The parent nav item ID
 * @param {boolean} hasManageableCompetitions - Whether non-terminal competitions are available
 * @returns {array} - Array of sub-items
 */
export const getSubMenuItems = (parentId, hasManageableCompetitions = false) => {
  const item = getNavItemById(parentId, hasManageableCompetitions);
  return item?.subItems || [];
};
