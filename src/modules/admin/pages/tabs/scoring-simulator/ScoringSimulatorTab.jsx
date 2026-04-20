import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowsRotate,
  FaCalculator,
  FaChartLine,
  FaClock,
  FaLayerGroup,
  FaTrophy,
  FaUser,
  FaUsers,
} from "react-icons/fa6";
import { apiGet, API_ENDPOINTS } from "../../../../../utils/api";
import { DEFAULT_COMPETITION_FORM } from "../../../constants";
import {
  calculateScoringSimulation,
  formatMinutesLabel,
  normalizeScoringSettings,
} from "../../../utils/scoringSimulation";
import "./ScoringSimulatorTab.css";

const DEFAULT_SCORING_SETTINGS = DEFAULT_COMPETITION_FORM.scoringSettings;
const INSIGHTS_REFRESH_INTERVAL_MS = 5000;

const toNumber = (value, fallback = 0) => {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getCompetitionDurationMinutes = (competition) => {
  const startTime = Date.parse(competition?.start_date || competition?.startDate || "");
  const endTime = Date.parse(competition?.end_date || competition?.endDate || "");

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return 480;
  }

  return Math.max(Math.round((endTime - startTime) / 60000), 1);
};

const getSelectedCompetition = (competitions, selectedCompId) => (
  competitions.find((competition) => Number(competition.id) === Number(selectedCompId))
  || competitions.find((competition) => competition.status === "active")
  || competitions.find((competition) => competition.status === "paused")
  || competitions.find((competition) => competition.status === "upcoming")
  || competitions[0]
  || null
);

const buildChallengeProjection = ({
  challenge,
  scoringSettings,
  teamCount,
  competitionDurationMinutes,
}) => {
  const basePoints = Math.max(
    Math.round(toNumber(challenge.points ?? challenge.competition_points, 0)),
    0
  );
  const midpointSolveCount = Math.max(Math.ceil(teamCount / 2), 1);
  const earlyResult = calculateScoringSimulation({
    maxScore: basePoints,
    solveCount: 1,
    solveTimeMinutes: Math.round(competitionDurationMinutes * 0.05),
    attempts: 1,
    competitionDurationMinutes,
    ...scoringSettings,
  });
  const midResult = calculateScoringSimulation({
    maxScore: basePoints,
    solveCount: midpointSolveCount,
    solveTimeMinutes: Math.round(competitionDurationMinutes * 0.5),
    attempts: 2,
    competitionDurationMinutes,
    ...scoringSettings,
  });
  const lateResult = calculateScoringSimulation({
    maxScore: basePoints,
    solveCount: teamCount,
    solveTimeMinutes: Math.round(competitionDurationMinutes * 0.85),
    attempts: 3,
    competitionDurationMinutes,
    ...scoringSettings,
  });

  return {
    ...challenge,
    basePoints,
    earlyScore: earlyResult.finalScore,
    midScore: midResult.finalScore,
    lateScore: lateResult.finalScore,
    minScore: lateResult.minScore,
    scoreDrop: Math.max(earlyResult.finalScore - lateResult.finalScore, 0),
  };
};

const ScoringSimulatorTab = ({
  competitions = [],
  selectedCompId = null,
  onSelectCompetition,
}) => {
  const [challengeRows, setChallengeRows] = useState([]);
  const [teamRows, setTeamRows] = useState([]);
  const [memberRows, setMemberRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const requestIdRef = useRef(0);
  const selectedCompetition = useMemo(
    () => getSelectedCompetition(competitions, selectedCompId),
    [competitions, selectedCompId]
  );
  const selectedCompetitionId = selectedCompetition?.id || null;

  const loadInsights = useCallback(async ({ initialLoad = false } = {}) => {
    if (!selectedCompetitionId) {
      setChallengeRows([]);
      setTeamRows([]);
      setMemberRows([]);
      setRefreshError("");
      setLastUpdatedAt(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (initialLoad) {
      setLoading(true);
    }

    try {
      const [challengesResponse, rankingsResponse] = await Promise.all([
        apiGet(API_ENDPOINTS.ADMIN_COMPETITION_CHALLENGES_LIST(selectedCompetitionId), { cache: "no-store" }),
        apiGet(API_ENDPOINTS.COMPETITIONS_RANKINGS(selectedCompetitionId), { cache: "no-store" }),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextChallenges = Array.isArray(challengesResponse.data)
        ? challengesResponse.data
        : [];
      const rankingsData = rankingsResponse.data || {};

      setChallengeRows(nextChallenges);
      setTeamRows(Array.isArray(rankingsData.teams) ? rankingsData.teams : []);
      setMemberRows(Array.isArray(rankingsData.members) ? rankingsData.members : []);
      setRefreshError("");
      setLastUpdatedAt(Date.now());
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setRefreshError(error?.message || "Unable to load scoring insights right now.");
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [selectedCompetitionId]);

  useEffect(() => {
    void loadInsights({ initialLoad: true });

    if (!selectedCompetitionId) {
      return undefined;
    }

    const refreshNow = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void loadInsights();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNow();
      }
    };
    const intervalId = window.setInterval(refreshNow, INSIGHTS_REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadInsights, selectedCompetitionId]);

  const scoringSettings = useMemo(
    () => normalizeScoringSettings(
      selectedCompetition?.scoring_settings || DEFAULT_SCORING_SETTINGS
    ),
    [selectedCompetition]
  );
  const competitionDurationMinutes = useMemo(
    () => getCompetitionDurationMinutes(selectedCompetition),
    [selectedCompetition]
  );
  const teamCount = Math.max(
    toNumber(selectedCompetition?.team_count ?? selectedCompetition?.teamCount, teamRows.length || 1),
    1
  );
  const challengeProjectionRows = useMemo(
    () => challengeRows.map((challenge) => buildChallengeProjection({
      challenge,
      scoringSettings,
      teamCount,
      competitionDurationMinutes,
    })),
    [challengeRows, scoringSettings, teamCount, competitionDurationMinutes]
  );
  const highestBaseChallenge = useMemo(
    () => challengeProjectionRows.reduce(
      (highest, challenge) => (
        !highest || challenge.basePoints > highest.basePoints ? challenge : highest
      ),
      null
    ),
    [challengeProjectionRows]
  );
  const biggestDropChallenge = useMemo(
    () => challengeProjectionRows.reduce(
      (largest, challenge) => (
        !largest || challenge.scoreDrop > largest.scoreDrop ? challenge : largest
      ),
      null
    ),
    [challengeProjectionRows]
  );
  const topTeam = teamRows[0] || null;
  const topMember = memberRows[0] || null;
  const participantCount = Math.max(
    toNumber(
      selectedCompetition?.total_member_count ?? selectedCompetition?.totalParticipants,
      memberRows.length
    ),
    memberRows.length
  );

  if (!selectedCompetition) {
    return (
      <div className="admin-section scoring-simulator-tab">
        <div className="leaderboard-card">
          <div className="leaderboard-meta">
            <span>No competition available for scoring insights yet.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="admin-section scoring-simulator-tab">
      <div className="section-header scoring-simulator-header">
        <div className="header-content">
          <h3><FaCalculator style={{ marginRight: 10, verticalAlign: "middle" }} />Scoring Insights</h3>
          <p className="section-subtitle">
            Review challenge score reduction, scoring settings, and the live team
            and member points for the selected competition.
          </p>
        </div>
        <div className="scoring-toolbar">
          <label className="competition-selector">
            <span>Competition</span>
            <select
              value={selectedCompetitionId || ""}
              onChange={(event) => {
                const nextCompetitionId = Number(event.target.value) || null;
                onSelectCompetition?.(nextCompetitionId);
              }}
            >
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="scoring-reset-button"
            onClick={() => {
              void loadInsights({ initialLoad: !lastUpdatedAt });
            }}
          >
            <FaArrowsRotate /> Refresh
          </button>
        </div>
      </div>

      <div className="scoring-summary-grid">
        <article className="scoring-summary-card">
          <span className="summary-label"><FaUsers /> Competition Scope</span>
          <strong>{teamCount} teams</strong>
          <p>
            {participantCount} members, {challengeProjectionRows.length} challenges,
            {` ${formatMinutesLabel(competitionDurationMinutes)} total duration.`}
          </p>
        </article>
        <article className="scoring-summary-card">
          <span className="summary-label"><FaChartLine /> Score Formula</span>
          <strong>
            {Math.round(scoringSettings.solverWeight * 100)}/
            {Math.round(scoringSettings.timeWeight * 100)}
          </strong>
          <p>
            Solver/time split, decay {scoringSettings.solverDecayConstant}, attempt
            penalty {scoringSettings.attemptPenaltyConstant}, floor {scoringSettings.minScoreFloor}.
          </p>
        </article>
        <article className="scoring-summary-card scoring-summary-card--accent">
          <span className="summary-label"><FaClock /> Last Update</span>
          <strong>{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "--"}</strong>
          <p>
            {refreshError
              ? "Showing the last good data while refresh retries."
              : `${selectedCompetition?.status || "--"} competition state.`}
          </p>
        </article>
      </div>

      <div className="insights-layout">
        <article className="scoring-panel">
          <div className="scoring-panel-header">
            <h4><FaLayerGroup style={{ marginRight: 8, verticalAlign: "middle" }} />Admin Focus</h4>
            <p>Important scoring signals to review before and during the competition.</p>
          </div>
          <div className="insight-grid">
            <div className="result-metric">
              <span>Highest base challenge</span>
              <strong>{highestBaseChallenge ? `${highestBaseChallenge.title}` : "--"}</strong>
              <p>{highestBaseChallenge ? `${highestBaseChallenge.basePoints} pts base score` : "No challenges loaded yet."}</p>
            </div>
            <div className="result-metric">
              <span>Largest projected drop</span>
              <strong>{biggestDropChallenge ? `${biggestDropChallenge.scoreDrop} pts` : "--"}</strong>
              <p>{biggestDropChallenge ? biggestDropChallenge.title : "No challenge decay data available."}</p>
            </div>
            <div className="result-metric">
              <span>Leading team</span>
              <strong>{topTeam ? `${topTeam.name}` : "--"}</strong>
              <p>{topTeam ? `${toNumber(topTeam.points).toLocaleString()} pts, ${toNumber(topTeam.challenges_solved).toLocaleString()} solves` : "No team scores yet."}</p>
            </div>
            <div className="result-metric">
              <span>Leading member</span>
              <strong>{topMember ? `${topMember.username}` : "--"}</strong>
              <p>{topMember ? `${toNumber(topMember.points).toLocaleString()} pts, ${toNumber(topMember.challenges_solved).toLocaleString()} solves` : "No member scores yet."}</p>
            </div>
          </div>
          <div className="result-progress">
            <div className="result-progress-copy">
              <span>Projection assumptions</span>
              <strong>{formatMinutesLabel(competitionDurationMinutes)}</strong>
            </div>
            <p>
              Challenge projections assume an early solve at 5% of match time with 1
              attempt, a middle solve at 50% with 2 attempts, and a late solve at 85%
              with 3 attempts across {teamCount} teams.
            </p>
          </div>
        </article>

        <article className="scoring-panel">
          <div className="scoring-panel-header">
            <h4><FaTrophy style={{ marginRight: 8, verticalAlign: "middle" }} />Live Scores</h4>
            <p>Current points awarded in the selected competition.</p>
          </div>
          <div className="insight-grid">
            <div className="result-metric">
              <span>Top team points</span>
              <strong>{topTeam ? toNumber(topTeam.points).toLocaleString() : 0}</strong>
            </div>
            <div className="result-metric">
              <span>Top member points</span>
              <strong>{topMember ? toNumber(topMember.points).toLocaleString() : 0}</strong>
            </div>
            <div className="result-metric">
              <span>Challenges in play</span>
              <strong>{challengeProjectionRows.length}</strong>
            </div>
            <div className="result-metric">
              <span>Members online</span>
              <strong>
                {toNumber(
                  selectedCompetition?.online_member_count ?? selectedCompetition?.currentParticipants,
                  0
                )}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <article className="scoring-panel">
        <div className="scoring-panel-header">
          <h4><FaCalculator style={{ marginRight: 8, verticalAlign: "middle" }} />Challenge Score Reduction</h4>
          <p>
            Base challenge points and projected reduction using the competition scoring
            formula over early, middle, and late solves.
          </p>
        </div>

        {loading && !lastUpdatedAt ? (
          <div className="team-score-note">Loading scoring insights...</div>
        ) : (
          <div className="team-score-table-wrap">
            <table className="team-score-table">
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>Category</th>
                  <th>Base</th>
                  <th>Early</th>
                  <th>Mid</th>
                  <th>Late</th>
                  <th>Floor</th>
                  <th>Drop</th>
                </tr>
              </thead>
              <tbody>
                {challengeProjectionRows.map((challenge) => (
                  <tr key={challenge.id}>
                    <td>{challenge.title}</td>
                    <td>{challenge.category_name || challenge.category || "--"}</td>
                    <td>{challenge.basePoints}</td>
                    <td>{challenge.earlyScore}</td>
                    <td>{challenge.midScore}</td>
                    <td>{challenge.lateScore}</td>
                    <td>{challenge.minScore}</td>
                    <td className="team-score-cell">{challenge.scoreDrop}</td>
                  </tr>
                ))}
                {challengeProjectionRows.length === 0 && (
                  <tr>
                    <td colSpan="8">No competition challenges found for this competition.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="insights-layout">
        <article className="scoring-panel">
          <div className="scoring-panel-header">
            <h4><FaUsers style={{ marginRight: 8, verticalAlign: "middle" }} />Team Scores</h4>
            <p>Current team points and solves.</p>
          </div>
          <div className="team-score-table-wrap">
            <table className="team-score-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Points</th>
                  <th>Solves</th>
                  <th>Members</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((team) => (
                  <tr key={team.id}>
                    <td>#{team.rank_position}</td>
                    <td>{team.name}</td>
                    <td className="team-score-cell">{toNumber(team.points).toLocaleString()}</td>
                    <td>{toNumber(team.challenges_solved).toLocaleString()}</td>
                    <td>{toNumber(team.member_count).toLocaleString()}</td>
                  </tr>
                ))}
                {teamRows.length === 0 && (
                  <tr>
                    <td colSpan="5">No team scores recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="scoring-panel">
          <div className="scoring-panel-header">
            <h4><FaUser style={{ marginRight: 8, verticalAlign: "middle" }} />Member Scores</h4>
            <p>Current member points and solves.</p>
          </div>
          <div className="team-score-table-wrap">
            <table className="team-score-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Member</th>
                  <th>Team</th>
                  <th>Points</th>
                  <th>Solves</th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((member) => (
                  <tr key={member.id}>
                    <td>#{member.rank_position}</td>
                    <td>{member.username}</td>
                    <td>{member.team_name || "--"}</td>
                    <td className="team-score-cell">{toNumber(member.points).toLocaleString()}</td>
                    <td>{toNumber(member.challenges_solved).toLocaleString()}</td>
                  </tr>
                ))}
                {memberRows.length === 0 && (
                  <tr>
                    <td colSpan="5">No member scores recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      {refreshError && (
        <div className="team-score-note team-score-note--error">{refreshError}</div>
      )}
    </section>
  );
};

export default ScoringSimulatorTab;
