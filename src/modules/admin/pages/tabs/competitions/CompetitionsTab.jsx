import { useState, useMemo, useCallback } from "react";
import { FaChartLine, FaShieldHalved, FaBolt, FaArrowUpLong, FaArrowDownLong, FaList } from "react-icons/fa6";
import {
  CompetitionDashboardHeader,
  CompetitionInfoModal,
  PreCompetitionChecklist,
  SubmissionStats,
} from "../../../components/competition-dashboard";
import {
  CompetitionGrid,
  useCompetitionStartValidation,
} from "../../../competition-management";
import "./CompetitionsTab.css";

/* ── Sort Columns Config ─────────────────────────────────────────── */
const COMP_SORT_COLUMNS = {
  name:         { key: 'name',               label: 'Name',          numeric: false },
  status:       { key: 'status',             label: 'Status',        numeric: false },
  teams:        { key: 'teamCount',          label: 'Teams',         numeric: true },
  participants: { key: 'totalParticipants',  label: 'Participants',  numeric: true },
  challenges:   { key: 'challengeCount',     label: 'Challenges',    numeric: true },
  startDate:    { key: 'startDate',          label: 'Start Date',    numeric: false, isDate: true },
  endDate:      { key: 'endDate',            label: 'End Date',      numeric: false, isDate: true },
};

const STATUS_PRIORITY = { active: 0, paused: 1, upcoming: 2, done: 3, cancelled: 4 };

const getCompSortValue = (entry, columnId) => {
  const col = COMP_SORT_COLUMNS[columnId];
  if (!col) return 0;
  if (columnId === 'status') return STATUS_PRIORITY[entry.status] ?? 99;
  if (col.isDate) return entry[col.key] ? new Date(entry[col.key]).getTime() : 0;
  return entry[col.key] ?? 0;
};

/* ── Sortable Header Button ──────────────────────────────────────── */
const SortHeader = ({ columnId, label, sortBy, sortDir, onSort, className }) => {
  const isActive = sortBy === columnId;
  return (
    <button
      type="button"
      className={`cl-sort-header ${className || ''} ${isActive ? 'cl-sort-active' : ''}`}
      onClick={() => onSort(columnId)}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      {isActive && (
        <span className="cl-sort-arrow">
          {sortDir === 'asc' ? <FaArrowUpLong /> : <FaArrowDownLong />}
        </span>
      )}
    </button>
  );
};

const CompetitionsTab = ({
  competitions,
  handleStartCompetition,
  handlePauseCompetition,
  handleDoneCompetition,
  handleCancelCompetition,
  formatTime,
  pauseTimeRemaining,
  openModal,
  showResult,
}) => {
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [checklistCompetition, setChecklistCompetition] = useState(null);
  const [sortBy, setSortBy] = useState('startDate');
  const [sortDir, setSortDir] = useState('desc');

  const {
    activeCompetition,
    handleStartClick,
    hasActiveCompetition,
    manageableCompetitions,
    startValidationsByCompetitionId,
    startingCompetitionId,
    validationMessages,
  } = useCompetitionStartValidation({
    competitions,
    handleStartCompetition,
    onOpenChecklist: setChecklistCompetition,
    showResult,
  });

  const isCreateDisabled = competitions?.some(
    (comp) => comp.status === "active" || comp.status === "upcoming"
  );

  const handleSort = useCallback((columnId) => {
    setSortBy(prev => {
      if (prev === columnId) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return columnId;
      }
      const col = COMP_SORT_COLUMNS[columnId];
      setSortDir(col?.numeric || col?.isDate ? 'desc' : 'asc');
      return columnId;
    });
  }, []);

  const sortedCompetitions = useMemo(() => {
    if (!competitions?.length) return [];
    return [...competitions].sort((a, b) => {
      const aVal = getCompSortValue(a, sortBy);
      const bVal = getCompSortValue(b, sortBy);
      const col = COMP_SORT_COLUMNS[sortBy];
      let cmp;
      if (col?.numeric || col?.isDate || sortBy === 'status') {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [competitions, sortBy, sortDir]);

  const isDefaultSort = sortBy === 'startDate' && sortDir === 'desc';

  return (
    <div className="admin-section">
      <div className="section-header">
        <div className="header-content">
          <h3>Competition Management</h3>
          <p className="section-subtitle">Prepare, validate, start, and monitor competitions</p>
        </div>
        <button
          className={`btn-primary ${isCreateDisabled ? "btn-disabled" : ""}`}
          onClick={() => {
            if (!isCreateDisabled) openModal?.("createCompetition");
          }}
          disabled={isCreateDisabled}
          title={isCreateDisabled ? "Cannot create while a competition is active or upcoming" : "Create a new competition"}
          type="button"
        >
          <FaBolt /> Create Competition
        </button>
      </div>

      {activeCompetition && (
        <div className="active-competition-dashboard">
          <div className="dashboard-header-section">
            <CompetitionDashboardHeader
              competition={activeCompetition}
              formatTime={formatTime}
            />
          </div>

          <div className="dashboard-info-buttons">
            <button
              className="dashboard-info-btn"
              onClick={() => setShowStatsModal(true)}
              type="button"
            >
              <span className="dashboard-info-btn-icon analytics"><FaChartLine /></span>
              <span className="dashboard-info-btn-text">
                <span className="dashboard-info-btn-title">Submission Analytics</span>
                <span className="dashboard-info-btn-subtitle">View live submission stats</span>
              </span>
            </button>

            <button
              className="dashboard-info-btn"
              onClick={() => setChecklistCompetition(activeCompetition)}
              type="button"
            >
              <span className="dashboard-info-btn-icon checklist"><FaShieldHalved /></span>
              <span className="dashboard-info-btn-text">
                <span className="dashboard-info-btn-title">Pre-Competition Validation</span>
                <span className="dashboard-info-btn-subtitle">Review start requirements</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {showStatsModal && activeCompetition && (
        <CompetitionInfoModal
          icon={<FaChartLine />}
          onClose={() => setShowStatsModal(false)}
          title="Submission Analytics"
        >
          <SubmissionStats competitionId={activeCompetition.id} />
        </CompetitionInfoModal>
      )}

      {checklistCompetition && (
        <CompetitionInfoModal
          icon={<FaShieldHalved />}
          onClose={() => setChecklistCompetition(null)}
          title={`Pre-Competition Validation: ${checklistCompetition.name}`}
        >
          <PreCompetitionChecklist competition={checklistCompetition} />
        </CompetitionInfoModal>
      )}

      <CompetitionGrid
        formatTime={formatTime}
        hasActiveCompetition={hasActiveCompetition}
        manageableCompetitions={manageableCompetitions}
        onCancelCompetition={handleCancelCompetition}
        onDoneCompetition={handleDoneCompetition}
        onOpenChecklist={setChecklistCompetition}
        onPauseCompetition={handlePauseCompetition}
        onStartCompetition={handleStartClick}
        pauseTimeRemaining={pauseTimeRemaining}
        startValidationsByCompetitionId={startValidationsByCompetitionId}
        startingCompetitionId={startingCompetitionId}
        validationMessages={validationMessages}
      />

      {/* ═══ All Competitions — Sortable List ═══ */}
      <div className="cl-section">
        <div className="cl-section-header">
          <div className="cl-section-title-group">
            <div className="cl-section-icon"><FaList /></div>
            <div>
              <h4 className="cl-section-title">All Competitions</h4>
              <p className="cl-section-sub">{competitions?.length || 0} total competitions</p>
            </div>
          </div>
          {!isDefaultSort && (
            <button
              className="cl-sort-reset"
              onClick={() => { setSortBy('startDate'); setSortDir('desc'); }}
            >
              Reset sort
            </button>
          )}
        </div>

        {sortedCompetitions.length === 0 ? (
          <div className="cl-empty">No competitions found.</div>
        ) : (
          <div className="cl-table-wrap">
            {/* Sortable Header */}
            <div className="cl-table-header">
              <SortHeader columnId="name"         label="Name"         sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-name" />
              <SortHeader columnId="status"       label="Status"       sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-status" />
              <SortHeader columnId="teams"        label="Teams"        sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-teams" />
              <SortHeader columnId="participants" label="Participants" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-participants" />
              <SortHeader columnId="challenges"   label="Challenges"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-challenges" />
              <SortHeader columnId="startDate"    label="Start Date"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-date" />
              <SortHeader columnId="endDate"      label="End Date"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="cl-col-date" />
            </div>

            {/* Rows */}
            <div className="cl-table-body">
              {sortedCompetitions.map((comp, i) => (
                <div
                  key={comp.id}
                  className="cl-row"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span className="cl-col-name">
                    <span className="cl-comp-name">{comp.name}</span>
                  </span>
                  <span className="cl-col-status">
                    <span className={`cl-status-chip cl-status-${comp.status}`}>
                      {comp.status.charAt(0).toUpperCase() + comp.status.slice(1)}
                    </span>
                  </span>
                  <span className="cl-col-teams">
                    <span className="cl-num">{comp.teamCount}</span>
                  </span>
                  <span className="cl-col-participants">
                    <span className="cl-num">{comp.currentParticipants}/{comp.totalParticipants}</span>
                  </span>
                  <span className="cl-col-challenges">
                    <span className="cl-num">{comp.challengeCount}</span>
                  </span>
                  <span className="cl-col-date">
                    {comp.startDate ? new Date(comp.startDate).toLocaleDateString() : '—'}
                  </span>
                  <span className="cl-col-date">
                    {comp.endDate ? new Date(comp.endDate).toLocaleDateString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionsTab;
