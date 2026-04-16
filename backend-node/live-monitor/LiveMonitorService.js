import { query } from '../config/database.js';
import ChallengeService from '../services/ChallengeService.js';
import ParticipantMonitoringService from '../services/ParticipantMonitoringService.js';
import ScreenShareService from '../services/ScreenShareService.js';
import LiveMonitorActivityService from '../services/LiveMonitorActivityService.js';

const DEFAULT_ACTIVITY_STATUS = 'idle';
const SOLVING_ACTIVITY_STATUS = 'solving';
const LIVE_MONITOR_SELECT = `
  SELECT *
  FROM competition_live_monitor
  WHERE team_member_id = ?
  LIMIT 1
`;
const PRESENCE_LAST_SEEN_SQL = 'COALESCE(tm.last_seen_at, tm.last_login)';
const getPresenceTimeoutMs = () => {
  const configured = parseInt(
    process.env.COMPETITION_PRESENCE_TIMEOUT_MS
    || process.env.MEMBER_HEARTBEAT_TIMEOUT_MS
    || '300000',
    10
  );

  return Number.isFinite(configured) && configured > 0 ? configured : 300000;
};
const now = () => new Date();
const run = async (executor, sql, params = []) => {
  if (typeof executor === 'function') {
    return executor(sql, params);
  }

  if (executor && typeof executor.execute === 'function') {
    const [result] = await executor.execute(sql, params);

    return result;
  }

  return query(sql, params);
};
const getRow = async (executor, sql, params = []) => {
  const rows = await run(executor, sql, params);

  return Array.isArray(rows) ? rows[0] || null : null;
};
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const normalizeHints = value => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [String(value)];
};
const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};
const getChallengeActivitySummary = async (challengeId, executor = query) => {
  const normalizedChallengeId = toIntOrNull(challengeId);

  if (!normalizedChallengeId) {
    return null;
  }

  const row = await getRow(
    executor,
    `SELECT ch.id, ch.title, cat.name AS category_name
     FROM challenges ch
     LEFT JOIN categories cat ON cat.id = ch.category_id
     WHERE ch.id = ?
     LIMIT 1`,
    [normalizedChallengeId]
  );

  if (!row) {
    return {
      id: normalizedChallengeId,
      title: `Challenge #${normalizedChallengeId}`,
      category: 'Unknown',
    };
  }

  const decrypted = ChallengeService.decryptChallenge({ title: row.title });

  return {
    id: normalizedChallengeId,
    title: decrypted?.title || `Challenge #${normalizedChallengeId}`,
    category: row.category_name || 'Unknown',
  };
};
const getClientEventDescription = (eventType, challengeSummary = null) => {
  if (challengeSummary?.title) {
    switch (eventType) {
      case 'window_blur':
        return `Window lost focus while viewing ${challengeSummary.title}`;
      case 'window_focus':
        return `Window returned to ${challengeSummary.title}`;
      case 'tab_hidden':
        return `Tab hidden while viewing ${challengeSummary.title}`;
      case 'tab_visible':
        return `Tab returned while viewing ${challengeSummary.title}`;
      case 'copy':
        return `Copied content while viewing ${challengeSummary.title}`;
      case 'paste':
        return `Pasted content while viewing ${challengeSummary.title}`;
      default:
        return challengeSummary.title;
    }
  }

  switch (eventType) {
    case 'window_blur':
      return 'Window lost focus during the competition';
    case 'window_focus':
      return 'Window returned to the competition';
    case 'tab_hidden':
      return 'Competition tab was hidden';
    case 'tab_visible':
      return 'Competition tab became visible';
    case 'copy':
      return 'Copied content during the competition';
    case 'paste':
      return 'Pasted content during the competition';
    default:
      return 'Participant activity';
  }
};
const normalizeMonitorRow = row => {
  if (!row) {
    return null;
  }

  const decryptedChallenge = row.current_challenge_id
    ? ChallengeService.decryptChallenge({
      title: row.current_challenge_title,
      description: row.current_challenge_description,
      hints: row.current_challenge_hints,
      points: row.current_challenge_points,
    })
    : null;
  const challengeTitle = decryptedChallenge?.title || 'Browsing challenges';
  const challengeDescription = decryptedChallenge?.description || '';
  const challengePoints = Number.parseInt(decryptedChallenge?.points, 10) || 0;

  return {
    id: row.team_member_id,
    teamMemberId: row.team_member_id,
    competitionId: row.competition_id,
    competitionName: row.competition_name,
    teamId: row.team_id,
    teamName: row.team_name,
    username: row.username,
    name: row.name,
    score: Number.parseInt(row.score, 10) || 0,
    solves: Number.parseInt(row.solves, 10) || 0,
    status: row.current_challenge_id ? SOLVING_ACTIVITY_STATUS : DEFAULT_ACTIVITY_STATUS,
    isTabActive: Boolean(row.is_tab_active),
    lastTabBlur: row.last_tab_blur || null,
    lastActivityAt: row.last_activity_at || null,
    lastHeartbeatAt: row.last_heartbeat_at || null,
    currentChallenge: challengeTitle,
    lastSubmission: row.last_submission_at || 'No submissions yet',
    viewingChallengeData: row.current_challenge_id
      ? {
        id: row.current_challenge_id,
        title: challengeTitle,
        description: challengeDescription,
        category: row.current_challenge_category || 'Unknown',
        difficulty: row.current_challenge_difficulty || 'unknown',
        points: challengePoints,
        hints: normalizeHints(decryptedChallenge?.hints),
        viewedAt: row.current_challenge_viewed_at || row.updated_at,
      }
      : null,
  };
};

export class LiveMonitorService {
  static async getMemberContext(teamMemberId, executor = query) {
    return getRow(
      executor,
      `SELECT tm.id AS team_member_id, tm.team_id, t.competition_id
       FROM team_members tm
       INNER JOIN teams t ON t.id = tm.team_id
       WHERE tm.id = ?
       LIMIT 1`,
      [teamMemberId]
    );
  }

  static async getMemberMonitorRow(teamMemberId, executor = query) {
    return getRow(executor, LIVE_MONITOR_SELECT, [teamMemberId]);
  }

  static async upsertMemberMonitor(state, executor = query) {
    const competitionId = toIntOrNull(state.competitionId);
    const teamId = toIntOrNull(state.teamId);
    const teamMemberId = toIntOrNull(state.teamMemberId);

    if (!competitionId || !teamId || !teamMemberId) {
      throw new Error('competitionId, teamId, and teamMemberId are required for live monitor');
    }

    const currentChallengeId = toIntOrNull(state.currentChallengeId);
    const isTabActive = state.isTabActive === undefined ? true : Boolean(state.isTabActive);
    const activityStatus = currentChallengeId ? SOLVING_ACTIVITY_STATUS : DEFAULT_ACTIVITY_STATUS;
    const lastTabBlur = isTabActive ? null : (state.lastTabBlur || now());
    const viewedAt = currentChallengeId ? (state.currentChallengeViewedAt || now()) : null;

    return run(
      executor,
      `INSERT INTO competition_live_monitor (
         competition_id,
         team_id,
         team_member_id,
         current_challenge_id,
         activity_status,
         is_tab_active,
         last_tab_blur,
         current_challenge_viewed_at,
         last_activity_at,
         last_heartbeat_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         competition_id = VALUES(competition_id),
         team_id = VALUES(team_id),
         current_challenge_id = VALUES(current_challenge_id),
         activity_status = VALUES(activity_status),
         is_tab_active = VALUES(is_tab_active),
         last_tab_blur = VALUES(last_tab_blur),
         current_challenge_viewed_at = VALUES(current_challenge_viewed_at),
         last_activity_at = NOW(),
         last_heartbeat_at = NOW()`,
      [
        competitionId,
        teamId,
        teamMemberId,
        currentChallengeId,
        activityStatus,
        isTabActive ? 1 : 0,
        lastTabBlur,
        viewedAt,
      ]
    );
  }

  static async registerCompetitionLogin({ teamMemberId, teamId, competitionId }, executor = query) {
    const context = competitionId && teamId
      ? { competition_id: competitionId, team_id: teamId }
      : await this.getMemberContext(teamMemberId, executor);

    if (!context?.competition_id || !context?.team_id) {
      return { success: false, error: 'Unable to resolve member competition for live monitor' };
    }

    await this.upsertMemberMonitor(
      {
        competitionId: context.competition_id,
        teamId: context.team_id,
        teamMemberId,
        currentChallengeId: null,
        isTabActive: true,
        currentChallengeViewedAt: null,
      },
      executor
    );

    return { success: true };
  }

  static async recordClientActivity(activity = {}, executor = query) {
    const teamMemberId = toIntOrNull(activity.teamMemberId || activity.memberId);

    if (!teamMemberId) {
      return { success: false, error: 'teamMemberId is required' };
    }

    const existing = await this.getMemberMonitorRow(teamMemberId, executor);
    const context = await this.getMemberContext(teamMemberId, executor);

    if (!context?.competition_id || !context?.team_id) {
      return { success: false, error: 'Participant is not assigned to a competition' };
    }

    const clientEventType = activity.clientEventType || activity.eventType || null;
    const eventOccurredAt = activity.eventOccurredAt
      ? new Date(activity.eventOccurredAt)
      : now();
    const nextChallengeId = hasOwn(activity, 'currentChallengeId')
      ? toIntOrNull(activity.currentChallengeId)
      : toIntOrNull(existing?.current_challenge_id);
    const nextIsTabActive = hasOwn(activity, 'isTabActive')
      ? Boolean(activity.isTabActive)
      : Boolean(existing?.is_tab_active ?? true);
    const nextLastTabBlur = hasOwn(activity, 'isTabActive')
      ? (nextIsTabActive ? null : (activity.lastTabBlur || now()))
      : (existing?.last_tab_blur || null);
    const nextViewedAt = hasOwn(activity, 'currentChallengeId')
      ? (nextChallengeId ? (activity.currentChallengeViewedAt || now()) : null)
      : (existing?.current_challenge_viewed_at || null);
    const previousChallengeId = toIntOrNull(existing?.current_challenge_id);
    const previousIsTabActive = Boolean(existing?.is_tab_active ?? true);
    const eventChallengeId = hasOwn(activity, 'eventChallengeId')
      ? toIntOrNull(activity.eventChallengeId)
      : (nextChallengeId || previousChallengeId || null);

    await this.upsertMemberMonitor(
      {
        competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
        teamId: toIntOrNull(activity.teamId) || context.team_id,
        teamMemberId,
        currentChallengeId: nextChallengeId,
        isTabActive: nextIsTabActive,
        lastTabBlur: nextLastTabBlur,
        currentChallengeViewedAt: nextViewedAt,
      },
      executor
    );

    if (hasOwn(activity, 'isTabActive') && nextIsTabActive !== previousIsTabActive) {
      LiveMonitorActivityService.recordEvent({
        type: nextIsTabActive ? 'focus_regained' : 'focus_lost',
        memberId: teamMemberId,
        teamId: toIntOrNull(activity.teamId) || context.team_id,
        competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
        description: nextIsTabActive
          ? 'Participant returned to the competition window'
          : 'Participant switched away from the competition window',
      });
    }

    if (hasOwn(activity, 'currentChallengeId') && nextChallengeId !== previousChallengeId) {
      if (nextChallengeId) {
        const challengeSummary = await getChallengeActivitySummary(nextChallengeId, executor);

        LiveMonitorActivityService.recordEvent({
          type: 'challenge_opened',
          memberId: teamMemberId,
          teamId: toIntOrNull(activity.teamId) || context.team_id,
          competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
          description: challengeSummary
            ? `${challengeSummary.title} (${challengeSummary.category})`
            : `Challenge #${nextChallengeId}`,
          metadata: challengeSummary,
        });
        await ParticipantMonitoringService.recordEvent({
          type: 'challenge_opened',
          memberId: teamMemberId,
          teamId: toIntOrNull(activity.teamId) || context.team_id,
          competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
          challengeId: nextChallengeId,
          occurredAt: eventOccurredAt,
          description: challengeSummary
            ? `${challengeSummary.title} (${challengeSummary.category})`
            : `Challenge #${nextChallengeId}`,
          metadata: challengeSummary,
        }, executor);
      } else if (previousChallengeId) {
        LiveMonitorActivityService.recordEvent({
          type: 'challenge_closed',
          memberId: teamMemberId,
          teamId: toIntOrNull(activity.teamId) || context.team_id,
          competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
          description: 'Returned to the competition challenge list',
          metadata: {
            previousChallengeId,
          },
        });
        await ParticipantMonitoringService.recordEvent({
          type: 'challenge_closed',
          memberId: teamMemberId,
          teamId: toIntOrNull(activity.teamId) || context.team_id,
          competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
          challengeId: previousChallengeId,
          occurredAt: eventOccurredAt,
          description: 'Returned to the competition challenge list',
          metadata: {
            previousChallengeId,
          },
        }, executor);
      }
    }

    if (clientEventType) {
      const challengeSummary = eventChallengeId
        ? await getChallengeActivitySummary(eventChallengeId, executor)
        : null;

      LiveMonitorActivityService.recordEvent({
        type: clientEventType,
        memberId: teamMemberId,
        teamId: toIntOrNull(activity.teamId) || context.team_id,
        competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
        description: getClientEventDescription(clientEventType, challengeSummary),
        metadata: challengeSummary
          ? {
              ...challengeSummary,
              challengeId: challengeSummary.id,
            }
          : null,
        occurredAt: eventOccurredAt,
      });

      await ParticipantMonitoringService.recordEvent({
        type: clientEventType,
        memberId: teamMemberId,
        teamId: toIntOrNull(activity.teamId) || context.team_id,
        competitionId: toIntOrNull(activity.competitionId) || context.competition_id,
        challengeId: eventChallengeId,
        occurredAt: eventOccurredAt,
        description: getClientEventDescription(clientEventType, challengeSummary),
        metadata: challengeSummary
          ? {
              ...challengeSummary,
              challengeId: challengeSummary.id,
            }
          : null,
      }, executor);
    }

    return { success: true };
  }

  static async touchHeartbeat(activity = {}, executor = query) {
    return this.recordClientActivity(activity, executor);
  }

  static async recordSubmissionActivity(activity = {}, executor = query) {
    return this.recordClientActivity(
      {
        ...activity,
        isTabActive: true,
        currentChallengeId: activity.challengeId || activity.currentChallengeId || null,
      },
      executor
    );
  }

  static async markMemberOffline(teamMemberId, executor = query) {
    const id = toIntOrNull(teamMemberId);

    if (!id) {
      return { success: false, error: 'teamMemberId is required' };
    }

    await run(
      executor,
      `UPDATE competition_live_monitor
       SET current_challenge_id = NULL,
           activity_status = ?,
           is_tab_active = 0,
           last_tab_blur = COALESCE(last_tab_blur, NOW()),
           current_challenge_viewed_at = NULL,
           last_activity_at = NOW(),
           last_heartbeat_at = NOW()
       WHERE team_member_id = ?`,
      [DEFAULT_ACTIVITY_STATUS, id]
    );
    ScreenShareService.stopSession(id, 'participant-offline');

    return { success: true };
  }

  static async markMembersOffline(teamMemberIds = [], executor = query) {
    const ids = teamMemberIds
      .map(toIntOrNull)
      .filter(Boolean);

    if (!ids.length) {
      return { success: true, updated: 0 };
    }

    const placeholders = ids.map(() => '?').join(', ');
    const result = await run(
      executor,
      `UPDATE competition_live_monitor
       SET current_challenge_id = NULL,
           activity_status = ?,
           is_tab_active = 0,
           last_tab_blur = COALESCE(last_tab_blur, NOW()),
           current_challenge_viewed_at = NULL,
           last_activity_at = NOW(),
           last_heartbeat_at = NOW()
       WHERE team_member_id IN (${placeholders})`,
      [DEFAULT_ACTIVITY_STATUS, ...ids]
    );
    ScreenShareService.stopSessions(ids, 'participant-offline');

    return {
      success: true,
      updated: result?.affectedRows || 0,
    };
  }

  static async cleanupStaleMonitorPresence(executor = query) {
    const cutoff = new Date(Date.now() - getPresenceTimeoutMs());
    const staleRows = await run(
      executor,
      `SELECT lm.team_member_id
       FROM competition_live_monitor lm
       INNER JOIN team_members tm ON tm.id = lm.team_member_id
       WHERE tm.is_online = 1
       AND (${PRESENCE_LAST_SEEN_SQL} IS NULL OR ${PRESENCE_LAST_SEEN_SQL} < ?)`,
      [cutoff]
    );

    return this.markMembersOffline(
      (staleRows || []).map(row => row.team_member_id),
      executor
    );
  }

  static async getLiveParticipants(filters = {}, executor = query) {
    await this.cleanupStaleMonitorPresence(executor);

    const competitionId = toIntOrNull(filters.competitionId || filters.competition_id);
    const params = [];
    let whereClause = `
      WHERE tm.is_online = 1
      AND (${PRESENCE_LAST_SEEN_SQL} IS NOT NULL AND ${PRESENCE_LAST_SEEN_SQL} >= ?)
    `;

    params.push(new Date(Date.now() - getPresenceTimeoutMs()));

    if (competitionId) {
      whereClause += ' AND lm.competition_id = ?';
      params.push(competitionId);
    }

    const rows = await run(
      executor,
      `SELECT
         lm.team_member_id,
         lm.competition_id,
         lm.team_id,
         lm.current_challenge_id,
         lm.activity_status,
         lm.is_tab_active,
         lm.last_tab_blur,
         lm.current_challenge_viewed_at,
         lm.last_activity_at,
         lm.last_heartbeat_at,
         lm.updated_at,
         tm.username,
         tm.name,
         t.name AS team_name,
         c.name AS competition_name,
         COALESCE(mr.points, 0) AS score,
         COALESCE(mr.challenges_solved, 0) AS solves,
         latest_submission.submitted_at AS last_submission_at,
         ch.title AS current_challenge_title,
         ch.description AS current_challenge_description,
         ch.hints AS current_challenge_hints,
         ch.points AS current_challenge_points,
         ch.difficulty AS current_challenge_difficulty,
         cat.name AS current_challenge_category
       FROM competition_live_monitor lm
       INNER JOIN team_members tm ON tm.id = lm.team_member_id
       INNER JOIN teams t ON t.id = lm.team_id
       INNER JOIN competitions c ON c.id = lm.competition_id
       LEFT JOIN team_member_rankings mr
         ON mr.team_member_id = lm.team_member_id
        AND mr.competition_id = lm.competition_id
       LEFT JOIN (
         SELECT s.team_member_id, s.competition_id, MAX(s.submitted_at) AS submitted_at
         FROM submissions s
         GROUP BY s.team_member_id, s.competition_id
       ) latest_submission
         ON latest_submission.team_member_id = lm.team_member_id
        AND latest_submission.competition_id = lm.competition_id
       LEFT JOIN challenges ch ON ch.id = lm.current_challenge_id
       LEFT JOIN categories cat ON cat.id = ch.category_id
       ${whereClause}
       ORDER BY score DESC, solves DESC, lm.last_activity_at DESC, tm.username ASC`,
      params
    );

    const participants = (rows || []).map(normalizeMonitorRow);
    const {
      summaries: riskSummaryMap,
      databaseConnected,
      unavailableReason,
    } = await ParticipantMonitoringService.getRiskSummariesForParticipants(
      participants,
      executor
    );
    const participantsWithRisk = participants.map(participant => ({
      ...participant,
      riskAssessment: riskSummaryMap.get(
        `${participant.competitionId}:${participant.teamMemberId}`
      ) || ParticipantMonitoringService.buildParticipantAssessment([]),
    }));

    ScreenShareService.pruneToActiveMembers(
      participantsWithRisk.map(participant => participant.teamMemberId)
    );

    return {
      success: true,
      data: ScreenShareService.attachParticipantState(participantsWithRisk),
      meta: {
        integrityMonitor: {
          databaseConnected,
          unavailableReason,
          refreshedAt: new Date().toISOString(),
        },
      },
    };
  }

  static async getParticipantActivityHistory(teamMemberId, limit = 100) {
    try {
      const history = await ParticipantMonitoringService.getParticipantEventHistory(
        teamMemberId,
        limit
      );

      if (history.length > 0) {
        return {
          success: true,
          data: history,
        };
      }
    } catch (error) {
      console.warn('[LiveMonitor] Falling back to in-memory activity history:', error);
    }

    return {
      success: true,
      data: LiveMonitorActivityService.getHistory(teamMemberId, limit),
    };
  }
}

export default LiveMonitorService;
