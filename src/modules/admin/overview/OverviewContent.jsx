import { useMemo } from "react";
import {
  FiAward,
  FiBarChart2,
  FiCheckSquare,
  FiClock,
  FiFlag,
  FiPlus,
  FiTable,
  FiUsers,
  FiTrendingUp,
  FiUserCheck,
} from "react-icons/fi";
import { COMPETITION_STATUS } from "../constants";
import { GLOBAL_TABLE_BUTTONS, QUICK_ACTIONS } from "./overviewConfig";

const DEFAULT_OVERVIEW_STATS = {
  cards: {
    totalUsers: 0,
    activeChallenges: 0,
    activeCompetitions: 0,
    totalSubmissions: 0,
  },
  categories: {
    competition: [],
    practice: [],
  },
};

const formatStatValue = value => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString()
    : String(value ?? "0");
};

const StatsCards = ({ adminStats }) => (
  <div className="overview-grid">
    <div className="admin-stats-wrapper">
      <div className="admin-stats admin-stats-row">
        {adminStats.map(stat => {
          const Icon = stat.Icon;

          return (
            <div key={stat.label} className={`admin-stat-card stat-${stat.color}`}>
              <div className={`stat-icon-badge stat-icon-${stat.color}`}>
                <Icon />
              </div>
              <div className="stat-info">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const QuickActionsCard = ({ hasActiveCompetition, openModal, switchTab }) => (
  <div className="overview-card quick-actions-card">
    <div className="card-header">
      <h3>Quick Actions</h3>
      <span className="card-icon">
        <FiPlus />
      </span>
    </div>
    <div className="card-content">
      <div className="action-buttons">
        {QUICK_ACTIONS.map(item => {
          const Icon = item.icon;
          const isDisabled = item.disabledWhenActive && hasActiveCompetition;
          const buttonTitle = isDisabled
            ? "Cannot create competition while one is active"
            : item.title;

          const handleClick = () => {
            if (item.action === "modal") {
              openModal(item.modal);
              return;
            }

            switchTab(item.tab);
          };

          return (
            <button
              key={item.key}
              className={`action-btn ${item.style}`}
              disabled={isDisabled}
              onClick={handleClick}
              title={buttonTitle}
              type="button"
            >
              <span className="action-icon">
                <Icon />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const LiveCompetitionsCard = ({ competitions, formatTime }) => (
  <div className="overview-card live-competitions-card">
    <div className="card-header">
      <h3>Live Competitions</h3>
      <span className="card-icon">
        <FiAward />
      </span>
    </div>
    <div className="card-content">
      <div className="competitions-summary">
        {competitions
          .filter(competition => competition.status === COMPETITION_STATUS.ACTIVE)
          .map(competition => (
            <div key={competition.id} className="comp-summary-card">
              <div className="comp-card-top">
                <div className="comp-title-section">
                  <h4>{competition.name}</h4>
                  <span className="badge badge-success">
                    <span className="live-dot"></span> Active
                  </span>
                </div>
              </div>
              <div className="comp-card-grid">
                <div className="comp-info-item">
                  <span className="comp-info-icon"><FiUsers /></span>
                  <div className="comp-info-text">
                    <span className="comp-info-label">Participants</span>
                    <span className="comp-info-value">
                      {competition.currentParticipants ?? competition.participants}/
                      {competition.totalParticipants || competition.maxParticipants || 0}
                    </span>
                  </div>
                </div>
                <div className="comp-info-item">
                  <span className="comp-info-icon"><FiClock /></span>
                  <div className="comp-info-text">
                    <span className="comp-info-label">Time Left</span>
                    <span className="comp-info-value">{formatTime(competition.timeRemaining)}</span>
                  </div>
                </div>
                <div className="comp-info-item">
                  <span className="comp-info-icon"><FiFlag /></span>
                  <div className="comp-info-text">
                    <span className="comp-info-label">End Date</span>
                    <span className="comp-info-value">{competition.endDate}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  </div>
);

const CategoryBreakdownCard = ({ categoryStats, title }) => (
  <div className="overview-card category-breakdown-card">
    <div className="card-header">
      <h3>{title}</h3>
      <span className="card-icon">
        <FiCheckSquare />
      </span>
    </div>
    <div className="card-content">
      <div className="category-stats-grid">
        {categoryStats.map(category => (
          <div key={category.name} className="category-stat">
            <h4>{category.name}</h4>
            <div className="category-metrics">
              <div className="metric">
                <span className="metric-label">Challenges</span>
                <span className="metric-value">{category.challenges}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Solves</span>
                <span className="metric-value">{category.solves}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DataTablesCard = ({ openModal }) => (
  <div className="overview-card data-tables-card">
    <div className="card-header">
      <h3>Global Tables</h3>
      <span className="card-icon">
        <FiTable />
      </span>
    </div>
    <div className="card-content">
      <div className="tables-button-grid">
        {GLOBAL_TABLE_BUTTONS.map(item => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              className={`table-btn ${item.style}`}
              onClick={() => openModal(item.modal)}
              title={item.title}
              type="button"
            >
              <span className="table-btn-icon">
                <Icon />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

const OverviewContent = ({
  competitions,
  openModal,
  switchTab,
  formatTime,
  overviewStats = DEFAULT_OVERVIEW_STATS,
}) => {
  const hasActiveCompetition = competitions.some(
    competition => competition.status === COMPETITION_STATUS.ACTIVE
  );
  const competitionCategoryStats = overviewStats?.categories?.competition || [];
  const practiceCategoryStats = overviewStats?.categories?.practice || [];
  const adminStats = useMemo(
    () => [
      {
        Icon: FiUsers,
        color: "blue",
        label: "Total Practice Users",
        value: formatStatValue(overviewStats?.cards?.totalPracticeUsers),
      },
      {
        Icon: FiCheckSquare,
        color: "cyan",
        label: "Active Challenges",
        value: formatStatValue(overviewStats?.cards?.activeChallenges),
      },
      {
        Icon: FiAward,
        color: "gold",
        label: "Active Competitions",
        value: formatStatValue(overviewStats?.cards?.activeCompetitions),
      },
      {
        Icon: FiBarChart2,
        color: "green",
        label: "Total Submissions",
        value: formatStatValue(overviewStats?.cards?.totalSubmissions),
      },
      {
        Icon: FiTrendingUp,
        color: "purple",
        label: "Total Competitions",
        value: formatStatValue(overviewStats?.cards?.totalCompetitions),
      },
      {
        Icon: FiUserCheck,
        color: "orange",
        label: "Competition Participants",
        value: formatStatValue(overviewStats?.cards?.totalCompetitionParticipants),
      },
    ],
    [overviewStats]
  );

  return (
    <div className="admin-section overview-section">
      <StatsCards adminStats={adminStats} />

      <div className="overview-cards-grid">
        <QuickActionsCard
          hasActiveCompetition={hasActiveCompetition}
          openModal={openModal}
          switchTab={switchTab}
        />
        <LiveCompetitionsCard competitions={competitions} formatTime={formatTime} />
        <CategoryBreakdownCard categoryStats={competitionCategoryStats} title="Competition Categories" />
        <CategoryBreakdownCard categoryStats={practiceCategoryStats} title="Practice Categories" />
        <DataTablesCard openModal={openModal} />
      </div>
    </div>
  );
};

export default OverviewContent;
