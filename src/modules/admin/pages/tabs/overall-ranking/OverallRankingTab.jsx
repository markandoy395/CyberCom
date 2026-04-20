import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FaTrophy, FaMedal, FaCrown, FaUser, FaUsers, FaArrowsRotate,
  FaChartBar, FaFire, FaCircleCheck, FaArrowUpLong, FaArrowDownLong,
  FaFilter,
} from 'react-icons/fa6';
import { apiGet, API_ENDPOINTS } from '../../../../../utils/api';
import './OverallRankingTab.css';

const REFRESH_MS = 30_000;

const getInitials = (name = '') =>
  name.split(/[\s_]/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';

const formatPoints = n => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const rankMeta = (rank) => {
  if (rank === 1) return { cls: 'gold', icon: <FaCrown /> };
  if (rank === 2) return { cls: 'silver', icon: <FaMedal /> };
  if (rank === 3) return { cls: 'bronze', icon: <FaMedal /> };
  return { cls: '', icon: null };
};

/* ─── Sort Columns Config ───────────────────────────────────────────────────── */
const SORT_COLUMNS = {
  rank:          { key: 'rank',             label: 'Rank',        numeric: true },
  player:        { key: 'player',           label: 'Player',      numeric: false },
  team:          { key: 'team',             label: 'Team',        numeric: false },
  solves:        { key: 'totalSolves',      label: 'Solves',      numeric: true },
  points:        { key: 'totalPoints',      label: 'Points',      numeric: true },
  lastActive:    { key: 'lastSubmissionAt', label: 'Last Active', numeric: false, isDate: true },
};

const getSortValue = (entry, columnId, isTeamView) => {
  if (columnId === 'player') {
    return isTeamView ? (entry.name || '') : (entry.username || entry.name || '');
  }
  if (columnId === 'team') {
    return entry.teamName || entry.email || '';
  }
  const col = SORT_COLUMNS[columnId];
  if (!col) return 0;
  if (col.isDate) {
    return entry[col.key] ? new Date(entry[col.key]).getTime() : 0;
  }
  return entry[col.key] ?? 0;
};

/* ─── Stat Summary Card ─────────────────────────────────────────────────────── */
const MetaCard = ({ icon, label, value, color }) => (
  <div className="or-meta-card" style={{ '--or-accent': color }}>
    <div className="or-meta-icon">{icon}</div>
    <div className="or-meta-info">
      <span className="or-meta-value">{value?.toLocaleString() ?? '—'}</span>
      <span className="or-meta-label">{label}</span>
    </div>
  </div>
);

/* ─── Sortable Column Header ────────────────────────────────────────────────── */
const SortHeader = ({ columnId, label, sortBy, sortDir, onSort, className }) => {
  const isActive = sortBy === columnId;
  return (
    <button
      type="button"
      className={`or-sort-header ${className || ''} ${isActive ? 'or-sort-active' : ''}`}
      onClick={() => onSort(columnId)}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      {isActive && (
        <span className="or-sort-arrow">
          {sortDir === 'asc' ? <FaArrowUpLong /> : <FaArrowDownLong />}
        </span>
      )}
    </button>
  );
};

/* ─── Main Component ────────────────────────────────────────────────────────── */
const OverallRankingTab = ({ type = 'competition' }) => {
  const isCompetition = type === 'competition';
  const [data, setData] = useState(null);
  const [view, setView] = useState('individual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sortBy, setSortBy] = useState('points');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState('');
  const [competitions, setCompetitions] = useState([]);
  const isMountedRef = useRef(true);

  const handleSort = useCallback((columnId) => {
    setSortBy(prev => {
      if (prev === columnId) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return columnId;
      }
      // Default to desc for numeric, asc for text
      const col = SORT_COLUMNS[columnId];
      setSortDir(col?.numeric || col?.isDate ? 'desc' : 'asc');
      return columnId;
    });
  }, []);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      let endpoint = isCompetition
        ? API_ENDPOINTS.ADMIN_RANKINGS_COMPETITION
        : API_ENDPOINTS.ADMIN_RANKINGS_PRACTICE;

      // Add competition_id filter if selected
      if (isCompetition && selectedCompetitionId) {
        endpoint += `?competition_id=${selectedCompetitionId}`;
      }

      const res = await apiGet(endpoint, { cache: 'no-store' });
      if (!isMountedRef.current) return;
      setData(res.data);
      // Populate competitions list from API response
      if (isCompetition && res.data?.competitions) {
        setCompetitions(res.data.competitions);
      }
      setError('');
      setLastUpdated(Date.now());
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || 'Failed to load rankings.');
    } finally {
      if (initial && isMountedRef.current) setLoading(false);
    }
  }, [isCompetition, selectedCompetitionId]);

  useEffect(() => {
    isMountedRef.current = true;
    void load(true);
    const iv = setInterval(() => {
      if (document.visibilityState !== 'hidden') void load(false);
    }, REFRESH_MS);
    return () => { isMountedRef.current = false; clearInterval(iv); };
  }, [load]);

  // Reset sort when switching view
  useEffect(() => {
    setSortBy('points');
    setSortDir('desc');
  }, [view]);

  /* Compute raw rows */
  const rawRows = useMemo(() => {
    if (!data) return [];
    if (isCompetition) return view === 'individual' ? (data.members || []) : (data.teams || []);
    return data.users || [];
  }, [data, isCompetition, view]);

  /* Sorted rows */
  const sortedRows = useMemo(() => {
    if (rawRows.length === 0) return [];
    const isTeamView = isCompetition && view === 'team';
    const sorted = [...rawRows].sort((a, b) => {
      const aVal = getSortValue(a, sortBy, isTeamView);
      const bVal = getSortValue(b, sortBy, isTeamView);

      const col = SORT_COLUMNS[sortBy];
      let cmp;
      if (col?.numeric || col?.isDate) {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Re-assign ranks based on sort
    return sorted.map((entry, i) => ({ ...entry, displayRank: i + 1 }));
  }, [rawRows, sortBy, sortDir, isCompetition, view]);

  const podium = sortedRows.slice(0, 3);
  const rest = sortedRows.slice(3);
  const meta = data?.meta || {};
  const isDefaultSort = sortBy === 'points' && sortDir === 'desc';

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="admin-section or-wrapper">
        <div className="or-skeleton-header" />
        <div className="or-skeleton-meta" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="or-skeleton-row" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="admin-section or-wrapper">

      {/* ── Header ── */}
      <div className="or-header">
        <div className="or-header-left">
          <div className="or-header-icon">
            {isCompetition ? <FaTrophy /> : <FaFire />}
          </div>
          <div>
            <h3 className="or-header-title">
              {isCompetition ? 'Competition' : 'Practice'} Overall Rankings
            </h3>
            <p className="or-header-sub">
              {lastUpdated
                ? `Updated ${timeAgo(lastUpdated)}`
                : 'Aggregated across all-time activity'}
            </p>
          </div>
        </div>

        <div className="or-header-right">
          {isCompetition && (
            <div className="or-view-toggle">
              <button
                className={`or-view-btn ${view === 'individual' ? 'active' : ''}`}
                onClick={() => setView('individual')}
              >
                <FaUser /> Individual
              </button>
              <button
                className={`or-view-btn ${view === 'team' ? 'active' : ''}`}
                onClick={() => setView('team')}
              >
                <FaUsers /> Team
              </button>
            </div>
          )}
          <button className="or-refresh-btn" onClick={() => void load(false)} title="Refresh">
            <FaArrowsRotate />
          </button>
        </div>
      </div>

      {/* ── Competition Filter ── */}
      {isCompetition && competitions.length > 0 && (
        <div className="or-filter-bar">
          <div className="or-filter-group">
            <FaFilter className="or-filter-icon" />
            <label className="or-filter-label" htmlFor="or-competition-filter">Competition</label>
            <select
              id="or-competition-filter"
              className="or-filter-select"
              value={selectedCompetitionId}
              onChange={e => setSelectedCompetitionId(e.target.value)}
            >
              <option value="">All Competitions</option>
              {competitions.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          {selectedCompetitionId && (
            <button
              className="or-filter-clear"
              onClick={() => setSelectedCompetitionId('')}
              title="Clear filter"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {error && <div className="or-error">{error}</div>}

      {/* ── Meta Cards ── */}
      <div className="or-meta-row">
        {isCompetition ? (
          <>
            <MetaCard icon={<FaUsers />}    label="Total Members"      value={meta.totalMembers}      color="#00d4ff" />
            <MetaCard icon={<FaUsers />}    label="Total Teams"        value={meta.totalTeams}        color="#6366f1" />
            <MetaCard icon={<FaTrophy />}   label="Competitions"       value={meta.totalCompetitions} color="#f59e0b" />
            <MetaCard icon={<FaCircleCheck />} label="Correct Solves" value={meta.totalCorrectSubmissions} color="#10b981" />
          </>
        ) : (
          <>
            <MetaCard icon={<FaUser />}     label="Total Users"   value={meta.totalUsers}  color="#00d4ff" />
            <MetaCard icon={<FaFire />}     label="Active Users"  value={meta.activeUsers}  color="#f97316" />
            <MetaCard icon={<FaCircleCheck />} label="Total Solves" value={meta.totalSolves} color="#10b981" />
            <MetaCard icon={<FaChartBar />} label="Ranked Players" value={sortedRows.length}      color="#6366f1" />
          </>
        )}
      </div>

      {/* ── Podium (only shown when sorting by points desc — default) ── */}
      {isDefaultSort && podium.length > 0 && (
        <div className="or-podium">
          {podium[1] && (
            <PodiumCard rank={2} entry={podium[1]} isTeamView={isCompetition && view === 'team'} />
          )}
          {podium[0] && (
            <PodiumCard rank={1} entry={podium[0]} isTeamView={isCompetition && view === 'team'} />
          )}
          {podium[2] && (
            <PodiumCard rank={3} entry={podium[2]} isTeamView={isCompetition && view === 'team'} />
          )}
        </div>
      )}

      {/* ── Leaderboard Table ── */}
      {sortedRows.length === 0 ? (
        <EmptyState isCompetition={isCompetition} view={view} />
      ) : (
        <div className="or-table-wrap">
          <div className="or-table-meta">
            <span>{sortedRows.length} {isCompetition ? (view === 'team' ? 'teams' : 'participants') : 'users'} ranked</span>
            {!isDefaultSort && (
              <button
                className="or-sort-reset"
                onClick={() => { setSortBy('points'); setSortDir('desc'); }}
                title="Reset to default sort"
              >
                Reset sort
              </button>
            )}
          </div>

          {/* Sortable Header */}
          <div className="or-table-header">
            <SortHeader columnId="rank"   label="Rank"   sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-rank" />
            <SortHeader columnId="player" label={isCompetition && view === 'team' ? 'Team' : 'Player'} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-player" />
            {isCompetition && view === 'individual' && (
              <SortHeader columnId="team" label="Team" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-team" />
            )}
            {!isCompetition && (
              <SortHeader columnId="team" label="Email" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-team" />
            )}
            <SortHeader columnId="solves"     label="Solves"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-solves" />
            <SortHeader columnId="points"     label="Points"      sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-points" />
            <SortHeader columnId="lastActive" label="Last Active" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="or-col-time" />
          </div>

          {/* Rows */}
          <div className="or-table-body">
            {(isDefaultSort ? rest : sortedRows).map((entry, i) => {
              const { cls } = isDefaultSort ? rankMeta(entry.displayRank) : { cls: '' };
              const displayName = isCompetition
                ? (view === 'team' ? entry.name : entry.username)
                : entry.username;
              const subLabel = isCompetition && view === 'individual'
                ? entry.teamName
                : (!isCompetition ? entry.email : null);

              return (
                <div
                  key={entry.id}
                  className={`or-row ${cls}`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span className="or-col-rank">
                    <span className="or-rank-chip">{entry.displayRank}</span>
                  </span>
                  <span className="or-col-player">
                    <span className="or-avatar">{getInitials(displayName)}</span>
                    <span className="or-player-name">{displayName}</span>
                  </span>
                  {subLabel !== null && (
                    <span className="or-col-team">{subLabel || '—'}</span>
                  )}
                  <span className="or-col-solves">
                    <span className="or-badge-solves">{entry.totalSolves}</span>
                  </span>
                  <span className="or-col-points or-points-highlight">
                    {formatPoints(entry.totalPoints)}
                  </span>
                  <span className="or-col-time">{timeAgo(entry.lastSubmissionAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Podium Card ───────────────────────────────────────────────────────────── */
const PodiumCard = ({ rank, entry, isTeamView }) => {
  const { cls, icon } = rankMeta(rank);
  const name = isTeamView ? entry.name : (entry.username || entry.name);
  return (
    <div className={`or-podium-card or-podium-${cls}`}>
      <div className="or-podium-icon">{icon}</div>
      <div className="or-podium-avatar">{getInitials(name)}</div>
      <div className="or-podium-name">{name}</div>
      <div className="or-podium-pts">{formatPoints(entry.totalPoints)}</div>
      <div className="or-podium-pts-label">points</div>
      <div className="or-podium-solves">{entry.totalSolves} solves</div>
      <div className={`or-podium-place or-podium-${cls}`}>#{rank}</div>
    </div>
  );
};

/* ─── Empty State ───────────────────────────────────────────────────────────── */
const EmptyState = ({ isCompetition, view }) => (
  <div className="or-empty">
    <div className="or-empty-icon">🏆</div>
    <p>No {isCompetition ? (view === 'team' ? 'teams' : 'participants') : 'users'} ranked yet.</p>
    <span>Rankings will appear once participants start solving challenges.</span>
  </div>
);

export default OverallRankingTab;
