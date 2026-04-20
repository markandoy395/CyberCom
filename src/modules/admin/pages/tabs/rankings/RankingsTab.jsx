import React, {
  startTransition,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  FaUser,
  FaUsers,
  FaArrowsRotate,
  FaTrophy,
  FaMedal,
  FaCrown,
  FaChevronDown,
} from "react-icons/fa6";
import { apiGet, API_ENDPOINTS } from "../../../../../utils/api";
import "./RankingsTab.css";

const RANKINGS_REFRESH_INTERVAL_MS = 2000;

const getInitials = (name) =>
  name
    ?.split(/[\s_]/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const RankingsTab = ({
  rankingType,
  setRankingType,
  competitions = [],
  selectedCompId = null,
}) => {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState({});
  const [refreshError, setRefreshError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const hasLoadedRankingsRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const currentCompetitionIdRef = useRef(null);
  const selectedCompetition = useMemo(
    () => competitions.find((competition) => Number(competition.id) === Number(selectedCompId))
      || competitions.find((competition) => competition.status === "active")
      || competitions[0]
      || null,
    [competitions, selectedCompId]
  );
  const selectedCompetitionId = selectedCompetition?.id || null;

  const toggleTeam = (id) =>
    setExpandedTeams((prev) => ({ ...prev, [id]: !prev[id] }));

  const loadRankings = useCallback(async ({ initialLoad = false } = {}) => {
    if (!selectedCompetitionId) {
      setUsers([]);
      setTeams([]);
      setRefreshError("");
      setLastUpdatedAt(null);
      hasLoadedRankingsRef.current = false;
      return;
    }

    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    const requestId = activeRequestIdRef.current + 1;
    const requestedCompetitionId = selectedCompetitionId;

    activeRequestIdRef.current = requestId;

    if (initialLoad) {
      setLoading(true);
    }

    try {
      const response = await apiGet(
        API_ENDPOINTS.COMPETITIONS_RANKINGS(selectedCompetitionId),
        {
          cache: "no-store",
        }
      );
      const payload = response.data || {};

      const nextUsers = (payload.members || []).map((member) => ({
        ...member,
        score: Number(member.points) || 0,
        solves: Number(member.challenges_solved) || 0,
      }));
      const nextTeams = (payload.teams || []).map((team) => ({
        ...team,
        points: Number(team.points) || 0,
        challenges_solved: Number(team.challenges_solved) || 0,
        member_count: Number(team.member_count) || 0,
        membersData: (team.members || []).map((member) => ({
          ...member,
          score: Number(member.points) || 0,
        })),
      }));

      if (
        activeRequestIdRef.current !== requestId
        || currentCompetitionIdRef.current !== requestedCompetitionId
      ) {
        return;
      }

      startTransition(() => {
        setUsers(nextUsers);
        setTeams(nextTeams);
        setRefreshError("");
        setLastUpdatedAt(Date.now());
      });
      hasLoadedRankingsRef.current = true;
    } catch (error) {
      if (
        activeRequestIdRef.current !== requestId
        || currentCompetitionIdRef.current !== requestedCompetitionId
      ) {
        return;
      }

      setRefreshError(
        error?.message || "Unable to refresh rankings right now."
      );

      if (!hasLoadedRankingsRef.current) {
        setUsers([]);
        setTeams([]);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        isRefreshingRef.current = false;
      }

      if (currentCompetitionIdRef.current === requestedCompetitionId) {
        setLoading(false);
      }
    }
  }, [selectedCompetitionId]);

  useEffect(() => {
    currentCompetitionIdRef.current = selectedCompetitionId;
    isRefreshingRef.current = false;
    setExpandedTeams({});
    setUsers([]);
    setTeams([]);
    setRefreshError("");
    setLastUpdatedAt(null);
    hasLoadedRankingsRef.current = false;

    if (!selectedCompetitionId) {
      setLoading(false);
      return undefined;
    }

    const refreshNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void loadRankings({
        initialLoad: !hasLoadedRankingsRef.current,
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNow();
      }
    };

    refreshNow();

    const interval = window.setInterval(
      refreshNow,
      RANKINGS_REFRESH_INTERVAL_MS
    );

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadRankings, selectedCompetitionId]);

  const sortedUsers = useMemo(
    () => users.slice().sort((a, b) => b.score - a.score || b.solves - a.solves),
    [users]
  );
  const sortedTeams = useMemo(
    () => teams.slice().sort((a, b) => b.points - a.points || b.challenges_solved - a.challenges_solved),
    [teams]
  );
  const podium = sortedUsers.slice(0, 3);
  const rest = sortedUsers.slice(3);

  if (!selectedCompetition) {
    return (
      <div className="admin-section rankings-modern">
        <div className="leaderboard-card">
          <div className="leaderboard-meta">
            <span>No competition available for rankings yet.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section rankings-modern">
      <div className="rankings-header">
        <div className="rankings-title">
          <FaTrophy className="rankings-title-icon" />
          <div>
            <h3>Rankings</h3>
            <p>
              {loading && !lastUpdatedAt
                ? "Loading rankings..."
                : `Live leaderboard for ${selectedCompetition.name}`}
            </p>
            {refreshError ? (
              <p>Showing the last successful rankings while a refresh retries.</p>
            ) : lastUpdatedAt ? (
              <p>Updated at {new Date(lastUpdatedAt).toLocaleTimeString()}</p>
            ) : null}
          </div>
        </div>

        <div className="rankings-controls">
          <div className="rankings-toggle">
            <button
              className={`rankings-toggle-btn ${
                rankingType === "individual" ? "active" : ""
              }`}
              onClick={() => setRankingType("individual")}
            >
              <FaUser /> Individual
            </button>
            <button
              className={`rankings-toggle-btn ${
                rankingType === "team" ? "active" : ""
              }`}
              onClick={() => setRankingType("team")}
            >
              <FaUsers /> Team
            </button>
          </div>
          <button
            className="rankings-refresh-btn"
            title="Refresh Rankings"
            type="button"
            onClick={() => {
              void loadRankings();
            }}
          >
            <FaArrowsRotate />
          </button>
        </div>
      </div>

      {rankingType === "individual" ? (
        <>
          {podium.length >= 1 && (
            <div className="podium">
              {podium[1] && (
                <PodiumCard place={2} user={podium[1]} icon={<FaMedal />} />
              )}
              {podium[0] && (
                <PodiumCard place={1} user={podium[0]} icon={<FaCrown />} />
              )}
              {podium[2] && (
                <PodiumCard place={3} user={podium[2]} icon={<FaMedal />} />
              )}
            </div>
          )}

          <div className="leaderboard-card">
            <div className="leaderboard-meta">
              <span>
                Showing {sortedUsers.length} participant
                {sortedUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="leaderboard-header">
              <span className="lb-col-rank">Rank</span>
              <span className="lb-col-name">Player</span>
              <span className="lb-col-solves">Solves</span>
              <span className="lb-col-points">Points</span>
            </div>
            <div className="leaderboard-scroll">
              {rest.map((user, idx) => (
                <div key={user.id} className="leaderboard-row">
                  <span className="lb-col-rank">
                    <span className="rank-chip">{idx + 4}</span>
                  </span>
                  <span className="lb-col-name">
                    <span className="player-avatar">
                      {getInitials(user.username)}
                    </span>
                    <span className="player-name">{user.username}</span>
                  </span>
                  <span className="lb-col-solves">{user.solves}</span>
                  <span className="lb-col-points">
                    {user.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="teams-list">
          <div className="teams-meta">
            <span>
              {sortedTeams.length} team{sortedTeams.length !== 1 ? "s" : ""} competing
            </span>
          </div>
          {sortedTeams.map((team, idx) => {
            const isOpen = !!expandedTeams[team.id];
            const rankClass =
              idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";

            return (
              <div key={team.id} className={`team-card ${rankClass}`}>
                <button
                  type="button"
                  className="team-card-header"
                  onClick={() => toggleTeam(team.id)}
                >
                  <span className={`team-rank-badge ${rankClass}`}>
                    {idx === 0 ? <FaCrown /> : idx + 1}
                  </span>
                  <div className="team-info">
                    <span className="team-name">{team.name}</span>
                    <span className="team-meta">
                      <FaUsers /> {team.member_count} members
                    </span>
                  </div>
                  <div className="team-points">
                    <span className="team-points-value">
                      {team.points.toLocaleString()}
                    </span>
                    <span className="team-points-label">points</span>
                  </div>
                  <FaChevronDown
                    className={`team-chevron ${isOpen ? "open" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="team-members-list">
                    {team.membersData.map((member) => (
                      <div key={member.id} className="team-member-row">
                        <span className="player-avatar small">
                          {getInitials(member.username)}
                        </span>
                        <span className="member-name">{member.username}</span>
                        <span className="member-score">
                          {member.score.toLocaleString()} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PodiumCard = ({ place, user, icon }) => {
  const placeClass =
    place === 1 ? "first" : place === 2 ? "second" : "third";

  return (
    <div className={`podium-card podium-${placeClass}`}>
      <div className="podium-icon">{icon}</div>
      <div className="podium-avatar">{getInitials(user.username)}</div>
      <div className="podium-name">{user.username}</div>
      <div className="podium-points">{user.score.toLocaleString()}</div>
      <div className="podium-label">points</div>
      <div className="podium-place">#{place}</div>
    </div>
  );
};

export default RankingsTab;
