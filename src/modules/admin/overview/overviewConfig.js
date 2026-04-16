import {
  FiActivity,
  FiAward,
  FiBook,
  FiCheckSquare,
  FiDatabase,
  FiEdit2,
  FiLayers,
  FiPlus,
  FiSettings,
  FiUsers,
} from "react-icons/fi";

export const QUICK_ACTIONS = [
  {
    action: "modal",
    icon: FiPlus,
    key: "createChallenge",
    label: "Create Challenge",
    modal: "createChallenge",
    style: "action-create",
    title: "Create a new challenge",
  },
  {
    action: "modal",
    icon: FiAward,
    key: "createCompetition",
    label: "Create Competition",
    modal: "createCompetition",
    style: "action-create",
    title: "Create a new competition",
  },
  {
    action: "modal",
    icon: FiEdit2,
    key: "manageCategories",
    label: "Manage Categories",
    modal: "manageCategories",
    style: "action-manage",
    title: "Manage challenge categories",
  },
  {
    action: "modal",
    icon: FiDatabase,
    key: "openCompetitionData",
    label: "Competition Data",
    modal: "viewCompetitionTables",
    style: "action-view",
    title: "Open the competition data center",
  },
];

export const GLOBAL_TABLE_BUTTONS = [
  { icon: FiSettings, key: "viewPracticeUsers", label: "Practice Users", modal: "viewPracticeUsers", style: "table-btn-admin", tableType: "practice-users", title: "View practice users" },
  { icon: FiAward, key: "viewCompetitionsTable", label: "Competitions", modal: "viewCompetitionsTable", style: "table-btn-competitions", tableType: "competitions", title: "View all competitions" },
  { icon: FiCheckSquare, key: "viewChallengesTable", label: "Challenges", modal: "viewChallengesTable", style: "table-btn-challenges", tableType: "challenges", title: "View all challenges" },
  { icon: FiLayers, key: "viewCategoriesTable", label: "Categories", modal: "viewCategoriesTable", style: "table-btn-categories", tableType: "categories", title: "View categories" },
  { icon: FiCheckSquare, key: "viewSubmissionsTable", label: "Submissions", modal: "viewSubmissionsTable", style: "table-btn-submissions", tableType: "submissions", title: "View all submissions" },
];

export const COMPETITION_TABLE_BUTTONS = [
  { icon: FiUsers, key: "viewTeamsTable", label: "Teams", modal: "viewTeamsTable", style: "table-btn-teams", tableType: "teams", requiresCompetition: true, title: "View teams for a selected competition" },
  { icon: FiUsers, key: "viewMembersTable", label: "Members", modal: "viewMembersTable", style: "table-btn-members", tableType: "members", requiresCompetition: true, title: "View team members for a selected competition" },
  { icon: FiBook, key: "viewRulesTable", label: "Rules", modal: "viewRulesTable", style: "table-btn-rules", tableType: "rules", requiresCompetition: true, title: "View rules for a selected competition" },
  { icon: FiAward, key: "viewTeamRankingsTable", label: "Team Rankings", modal: "viewTeamRankingsTable", style: "table-btn-rankings", tableType: "team-rankings", requiresCompetition: true, title: "View team rankings for a selected competition" },
  { icon: FiAward, key: "viewMemberRankingsTable", label: "Member Rankings", modal: "viewMemberRankingsTable", style: "table-btn-member-rankings", tableType: "member-rankings", requiresCompetition: true, title: "View member rankings for a selected competition" },
  { icon: FiActivity, key: "viewLoginHistory", label: "Login History", modal: "viewLoginHistory", style: "table-btn-history", tableType: "history", requiresCompetition: true, title: "View login history for a selected competition" },
  { icon: FiActivity, key: "viewLiveMonitorTable", label: "Live Monitor", modal: "viewLiveMonitorTable", style: "table-btn-live-monitor", tableType: "live-monitor", requiresCompetition: true, title: "View live monitor data for a selected competition" },
];

export const TABLE_BUTTONS = [
  ...GLOBAL_TABLE_BUTTONS,
  ...COMPETITION_TABLE_BUTTONS,
];
