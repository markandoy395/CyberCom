import express from 'express';
import { attachAdminIfPresent, isAdmin } from './admin.js';
import { attachCompetitionMemberIfPresent } from '../middleware/competitionAuth.js';
import { query } from '../config/database.js';
import CompetitionStatusService from '../services/CompetitionStatusService.js';
import CompetitionStartValidationService from '../services/CompetitionStartValidationService.js';
import RankingService from '../services/RankingService.js';
import RulesService from '../services/RulesService.js';
import SubmissionService from '../services/SubmissionService.js';
import TeamService from '../services/TeamService.js';
import LiveMonitorService from '../live-monitor/LiveMonitorService.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();
const CREATE_COMPETITION_DEFAULT_STATUS = 'upcoming';
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const MAX_COMPETITION_DURATION_HOURS = 8;
const MAX_COMPETITION_DURATION_MS = MAX_COMPETITION_DURATION_HOURS * 60 * 60 * 1000;

const normalizeCompetitionRows = (rows = []) => (
  rows.map(row => {
    let parsedSettings = null;
    if (row.solver_weight !== undefined) {
      parsedSettings = {
        solverWeight: row.solver_weight,
        timeWeight: row.time_weight,
        solverDecayConstant: row.solver_decay_constant,
        attemptPenaltyConstant: row.attempt_penalty_constant,
        minScoreFloor: row.min_score_floor
      };
    }

    return {
      ...row,
      scoring_settings: parsedSettings,
      status: CompetitionStatusService.getEffectiveStatus(row.status, row.end_date),
    };
  })
);
const getCompetitionId = value => parseInt(value, 10);
const normalizeDateTimeForMysql = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const pad = part => String(part).padStart(2, '0');

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} `
      + `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }

  const normalizedValue = String(value).trim();

  if (DATETIME_LOCAL_PATTERN.test(normalizedValue)) {
    return `${normalizedValue.replace('T', ' ')}:00`;
  }

  const parsed = new Date(normalizedValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalizeDateTimeForMysql(parsed);
};
const parseMysqlDateTime = value => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = String(value).trim();
  const isoLikeValue = normalizedValue.includes(' ')
    ? normalizedValue.replace(' ', 'T')
    : normalizedValue;
  const parsed = new Date(isoLikeValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const getCompetitionDurationMs = (startDate, endDate) => {
  const parsedStartDate = parseMysqlDateTime(startDate);
  const parsedEndDate = parseMysqlDateTime(endDate);

  if (!parsedStartDate || !parsedEndDate) {
    return null;
  }

  return parsedEndDate.getTime() - parsedStartDate.getTime();
};
const getPositiveLimit = (value, fallback) => {
  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const isAdminRequest = req => Boolean(req.isAdminAuthenticated);

// Get all competitions
router.get('/competitions', isAdmin, async (req, res) => {
  try {
    await TeamService.cleanupStalePresence(query);
    await CompetitionStatusService.finalizeExpiredCompetitions(query);

    const normalizedStatusFilter = req.query.status
      ? CompetitionStatusService.normalizeStatus(req.query.status, null)
      : null;
    let sql = `
      SELECT c.*,
             (
               SELECT COUNT(*)
               FROM teams t
               WHERE t.competition_id = c.id
             ) AS team_count,
             (
               SELECT COUNT(*)
               FROM competition_challenges cc
               WHERE cc.competition_id = c.id
             ) AS challenge_count,
             (
               SELECT COUNT(*)
               FROM team_members tm
               INNER JOIN teams t ON tm.team_id = t.id
               WHERE t.competition_id = c.id
             ) AS total_member_count,
             (
               SELECT COUNT(*)
               FROM team_members tm
               INNER JOIN teams t ON tm.team_id = t.id
               WHERE t.competition_id = c.id
               AND tm.is_online = 1
             ) AS online_member_count
      FROM competitions c
    `;

    if (req.query.status && !normalizedStatusFilter) {
      return res.status(400).json({ success: false, error: 'Invalid competition status filter' });
    }

    if (normalizedStatusFilter) {
      sql += ' WHERE c.status = ?';
      sql += ' ORDER BY c.created_at DESC';
      const filteredResults = await query(sql, [normalizedStatusFilter]);

      return res.json({ success: true, data: normalizeCompetitionRows(filteredResults) });
    }

    sql += ' ORDER BY c.created_at DESC';
    const results = await query(sql);
    res.json({ success: true, data: normalizeCompetitionRows(results) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get competition by ID
router.get(
  '/competitions/:id',
  attachAdminIfPresent,
  attachCompetitionMemberIfPresent,
  async (req, res) => {
  try {
    const requestedCompetitionId = parseInt(req.params.id, 10);
    const adminRequest = isAdminRequest(req);

    if (!adminRequest && !req.competitionMemberId) {
      return res.status(401).json({ success: false, error: 'Admin or competition token required' });
    }

    if (
      req.competitionMemberId
      && req.competitionSessionCompetitionId
      && requestedCompetitionId !== req.competitionSessionCompetitionId
    ) {
      return res.status(403).json({ success: false, error: 'Competition access denied' });
    }

    await TeamService.cleanupStalePresence(query);
    await CompetitionStatusService.finalizeExpiredCompetition(requestedCompetitionId, query);

    const sql = `
      SELECT c.*,
             (
               SELECT COUNT(*)
               FROM teams t
               WHERE t.competition_id = c.id
             ) AS team_count,
             (
               SELECT COUNT(*)
               FROM competition_challenges cc
               WHERE cc.competition_id = c.id
             ) AS challenge_count,
             (
               SELECT COUNT(*)
               FROM team_members tm
               INNER JOIN teams t ON tm.team_id = t.id
               WHERE t.competition_id = c.id
             ) AS total_member_count,
             (
               SELECT COUNT(*)
               FROM team_members tm
               INNER JOIN teams t ON tm.team_id = t.id
               WHERE t.competition_id = c.id
               AND tm.is_online = 1
             ) AS online_member_count
      FROM competitions c
      WHERE c.id = ?
    `;
    const results = normalizeCompetitionRows(
      await query(sql, [requestedCompetitionId])
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }

    res.json({ success: true, data: results[0] });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get competition teams
router.get('/competitions/:id/teams', isAdmin, async (req, res) => {
  try {
    await TeamService.cleanupStalePresence(query);

    // Get teams for the competition
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.max_members,
        t.points,
        t.competition_id,
        t.score,
        t.rank,
        t.status,
        t.created_at,
        t.updated_at
      FROM teams t
      WHERE t.competition_id = ?
      ORDER BY t.created_at DESC
    `;

    const results = await query(sql, [parseInt(req.params.id, 10)]);

    // Get actual members for each team
    const teamsWithMembers = await Promise.all(
      results.map(async team => {
        const members = await query(
          `SELECT tm.id, tm.username, tm.email, tm.name, tm.role,
                  COALESCE(mr.points, 0) AS points,
                  tm.status, tm.is_online, tm.last_login, tm.last_seen_at
           FROM team_members tm
           LEFT JOIN team_member_rankings mr
             ON mr.team_member_id = tm.id
            AND mr.competition_id = ?
           WHERE tm.team_id = ?
           ORDER BY tm.id ASC`,
          [parseInt(req.params.id, 10), team.id]
        );

        return {
          ...team,
          members: (members || []).map(member => TeamService.normalizeMemberPresence(member)),
          memberCount: members.length || 0,
        };
      })
    );

    res.json({ success: true, data: teamsWithMembers });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/members', isAdmin, async (req, res) => {
  try {
    await TeamService.cleanupStalePresence(query);

    const competitionId = getCompetitionId(req.params.id);
    const results = await query(
      `SELECT
         tm.id,
         tm.team_id,
         t.name AS team_name,
         tm.username,
         tm.email,
         tm.name,
         tm.role,
         mr.rank_position,
         COALESCE(mr.points, 0) AS points,
         COALESCE(mr.challenges_solved, 0) AS challenges_solved,
         tm.is_online,
         tm.status,
         tm.last_login,
         tm.last_seen_at
       FROM team_members tm
       INNER JOIN teams t ON t.id = tm.team_id
       LEFT JOIN team_member_rankings mr
         ON mr.team_member_id = tm.id
        AND mr.competition_id = t.competition_id
       WHERE t.competition_id = ?
       ORDER BY t.name ASC, tm.username ASC`,
      [competitionId]
    );

    return res.json({
      success: true,
      data: results.map(member => TeamService.normalizeMemberPresence(member)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/rules', async (req, res) => {
  try {
    const result = await RulesService.getRules('competition');

    return res.json({
      success: true,
      data: result.rules.map((ruleText, index) => ({
        display_order: index + 1,
        rule_text: ruleText,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/team-rankings', async (req, res) => {
  try {
    const competitionId = getCompetitionId(req.params.id);
    const result = await RankingService.getCompetitionRankings(competitionId);

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json({
      success: true,
      data: (result.data?.teams || []).map(team => ({
        rank_position: team.rank_position,
        team_id: team.id,
        team_name: team.name,
        points: team.points,
        challenges_solved: team.challenges_solved,
        member_count: team.member_count,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/member-rankings', async (req, res) => {
  try {
    const competitionId = getCompetitionId(req.params.id);
    const result = await RankingService.getCompetitionRankings(competitionId);

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json({
      success: true,
      data: (result.data?.members || []).map(member => ({
        rank_position: member.rank_position,
        team_member_id: member.id,
        team_id: member.team_id,
        team_name: member.team_name,
        username: member.username,
        name: member.name,
        points: member.points,
        challenges_solved: member.challenges_solved,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/login-history', isAdmin, async (req, res) => {
  try {
    const competitionId = getCompetitionId(req.params.id);
    const limit = getPositiveLimit(req.query.limit, 100);
    const results = await query(
      `SELECT
         lh.id,
         lh.admin_id,
         lh.team_member_id,
         COALESCE(lh.username, tm.username) AS username,
         tm.name AS team_member_name,
         t.id AS team_id,
         t.name AS team_name,
         lh.user_type,
         lh.competition_id,
         lh.device_fingerprint,
         lh.device_name,
         lh.ip_address,
         lh.user_agent,
         lh.browser,
         lh.os,
         lh.mac_address,
         lh.login_status,
         lh.failure_reason,
         lh.login_time,
         lh.logout_time,
         lh.is_active
       FROM login_history lh
       LEFT JOIN team_members tm ON tm.id = lh.team_member_id
       LEFT JOIN teams t ON t.id = tm.team_id
       WHERE lh.competition_id = ?
       ORDER BY lh.login_time DESC
       LIMIT ?`,
      [competitionId, limit]
    );

    return res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/live-monitor', isAdmin, async (req, res) => {
  try {
    const competitionId = getCompetitionId(req.params.id);
    const result = await LiveMonitorService.getLiveParticipants({ competitionId });

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json({
      success: true,
      data: (result.data || []).map(participant => ({
        team_member_id: participant.teamMemberId,
        competition_id: participant.competitionId,
        competition_name: participant.competitionName,
        team_id: participant.teamId,
        team_name: participant.teamName,
        username: participant.username,
        name: participant.name,
        score: participant.score,
        solves: participant.solves,
        status: participant.status,
        is_tab_active: participant.isTabActive,
        current_challenge: participant.currentChallenge,
        challenge_category: participant.viewingChallengeData?.category || null,
        challenge_points: participant.viewingChallengeData?.points ?? null,
        last_submission: participant.lastSubmission,
        last_activity_at: participant.lastActivityAt,
        last_heartbeat_at: participant.lastHeartbeatAt,
        last_tab_blur: participant.lastTabBlur,
        risk_assessment: participant.riskAssessment || null,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Create competition
router.post(['/competitions', '/admin/competitions'], isAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      status: rawStatus,
      start_date: rawStartDate,
      end_date: rawEndDate,
      participant_count,
      max_participants,
      scoring_settings = null,
    } = req.body;
    const normalizedStatus = rawStatus === undefined || rawStatus === null || rawStatus === ''
      ? CREATE_COMPETITION_DEFAULT_STATUS
      : CompetitionStatusService.normalizeStatus(rawStatus, null);
    const startDate = normalizeDateTimeForMysql(rawStartDate);
    const endDate = normalizeDateTimeForMysql(rawEndDate);
    const normalizedMaxParticipants = getPositiveLimit(max_participants, 8);
    const normalizedParticipantCount = Math.max(parseInt(participant_count, 10) || 0, 0);

    const solver_weight = scoring_settings?.solverWeight ?? 0.80;
    const time_weight = scoring_settings?.timeWeight ?? 0.20;
    const solver_decay_constant = scoring_settings?.solverDecayConstant ?? 0.12;
    const attempt_penalty_constant = scoring_settings?.attemptPenaltyConstant ?? 0.05;
    const min_score_floor = scoring_settings?.minScoreFloor ?? 10;

    if (!name || !rawStartDate || !rawEndDate) {
      return res
        .status(400)
        .json({ success: false, error: 'name, start_date, and end_date are required' });
    }

    if (!normalizedStatus) {
      return res.status(400).json({ success: false, error: 'Invalid competition status' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date or end_date format',
      });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'end_date must be after start_date',
      });
    }

    if (getCompetitionDurationMs(startDate, endDate) > MAX_COMPETITION_DURATION_MS) {
      return res.status(400).json({
        success: false,
        error: `Competition duration cannot exceed ${MAX_COMPETITION_DURATION_HOURS} hours`,
      });
    }

    const sql = `
      INSERT INTO competitions (
        name, description, status, start_date, end_date,
        participant_count, max_participants, created_at,
        solver_weight, time_weight, solver_decay_constant, attempt_penalty_constant, min_score_floor
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      name,
      description || null,
      normalizedStatus,
      startDate,
      endDate,
      normalizedParticipantCount,
      normalizedMaxParticipants,
      solver_weight,
      time_weight,
      solver_decay_constant,
      attempt_penalty_constant,
      min_score_floor
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        ...req.body,
        start_date: startDate,
        end_date: endDate,
        participant_count: normalizedParticipantCount,
        max_participants: normalizedMaxParticipants,
        scoring_settings,
        status: normalizedStatus,
      },
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Update competition
router.put('/competitions/:id', isAdmin, async (req, res) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    const { name, description, status: rawStatus, end_date, max_participants, scoring_settings } = req.body;
    const normalizedStatus = rawStatus === undefined
      ? undefined
      : CompetitionStatusService.normalizeStatus(rawStatus, null);
    let normalizedEndDate = null;
    const updates = [];
    const values = [];

    await CompetitionStatusService.finalizeExpiredCompetitions(query);

    if (rawStatus !== undefined && !normalizedStatus) {
      return res.status(400).json({
        success: false,
        error: 'Invalid competition status',
      });
    }

    if (normalizedStatus === 'active') {
      const [otherActiveCompetition] = await query(
        'SELECT id FROM competitions WHERE status = ? AND id <> ? LIMIT 1',
        ['active', competitionId]
      );

      if (otherActiveCompetition) {
        return res.status(400).json({
          success: false,
          error: 'Another competition is already active. Finish or pause it before starting a new one.',
        });
      }

      const validationResult = await CompetitionStartValidationService.assertCanStartCompetition(
        competitionId
      );

      if (!validationResult.success) {
        const blockingItems = validationResult.validation?.requiredFailedItems?.length
          ? validationResult.validation.requiredFailedItems
          : validationResult.validation?.failedItems;

        return res.status(validationResult.error === 'Competition not found' ? 404 : 400).json({
          success: false,
          error: validationResult.error,
          data: validationResult.validation
            ? {
                failedItems: (blockingItems || []).map(item => item.label),
              }
            : undefined,
        });
      }
    }

    if (end_date) {
      normalizedEndDate = normalizeDateTimeForMysql(end_date);

      if (!normalizedEndDate) {
        return res.status(400).json({
          success: false,
          error: 'Invalid end_date format',
        });
      }

      const competitionRows = await query(
        'SELECT start_date, status FROM competitions WHERE id = ? LIMIT 1',
        [competitionId]
      );

      if (!competitionRows.length) {
        return res.status(404).json({
          success: false,
          error: 'Competition not found',
        });
      }

      const competitionRow = competitionRows[0];
      const shouldValidateDuration = !['done', 'cancelled'].includes(
        String(competitionRow.status || '').toLowerCase()
      );
      const updatedDurationMs = getCompetitionDurationMs(
        competitionRow.start_date,
        normalizedEndDate
      );

      if (shouldValidateDuration && updatedDurationMs !== null && updatedDurationMs <= 0) {
        return res.status(400).json({
          success: false,
          error: 'end_date must be after start_date',
        });
      }

      if (shouldValidateDuration && updatedDurationMs > MAX_COMPETITION_DURATION_MS) {
        return res.status(400).json({
          success: false,
          error: `Competition duration cannot exceed ${MAX_COMPETITION_DURATION_HOURS} hours`,
        });
      }
    }

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description) {
      updates.push('description = ?');
      values.push(description);
    }
    if (normalizedStatus) {
      updates.push('status = ?');
      values.push(normalizedStatus);
    }
    if (end_date) {
      updates.push('end_date = ?');
      values.push(normalizedEndDate);
    }
    if (max_participants) {
      updates.push('max_participants = ?');
      values.push(max_participants);
    }

    if (scoring_settings !== undefined) {
      if (scoring_settings?.solverWeight !== undefined) {
        updates.push('solver_weight = ?');
        values.push(scoring_settings.solverWeight);
      }
      if (scoring_settings?.timeWeight !== undefined) {
        updates.push('time_weight = ?');
        values.push(scoring_settings.timeWeight);
      }
      if (scoring_settings?.solverDecayConstant !== undefined) {
        updates.push('solver_decay_constant = ?');
        values.push(scoring_settings.solverDecayConstant);
      }
      if (scoring_settings?.attemptPenaltyConstant !== undefined) {
        updates.push('attempt_penalty_constant = ?');
        values.push(scoring_settings.attemptPenaltyConstant);
      }
      if (scoring_settings?.minScoreFloor !== undefined) {
        updates.push('min_score_floor = ?');
        values.push(scoring_settings.minScoreFloor);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(competitionId);

    const sql = `UPDATE competitions SET ${updates.join(', ')} WHERE id = ?`;
    await query(sql, values);

    res.json({ success: true, message: 'Competition updated successfully' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get competition submissions with challenge and team details
router.get('/competitions/:id/submissions', isAdmin, async (req, res) => {
  try {
    const sanitize = req.query.sanitize === '1';
    const sql = `
      SELECT 
        s.id,
        s.competition_id,
        s.team_id,
        s.team_member_id,
        s.challenge_id,
        s.submitted_flag,
        s.is_correct,
        s.submission_status,
        s.awarded_points,
        s.attempt_number,
        s.ip_address,
        s.device_fingerprint,
        s.submitted_at,
        t.name as team_name,
        tm.username AS team_member_username,
        tm.name AS team_member_name,
        ch.title as challenge_title,
        ch.points
      FROM submissions s
      LEFT JOIN teams t ON s.team_id = t.id
      LEFT JOIN team_members tm ON s.team_member_id = tm.id
      LEFT JOIN challenges ch ON s.challenge_id = ch.id
      WHERE t.competition_id = ?
      ORDER BY s.submitted_at DESC, s.id DESC
    `;

    const results = await query(sql, [parseInt(req.params.id, 10)]);
    res.json({
      success: true,
      data: sanitize
        ? SubmissionService.sanitizeSubmissionRows(results)
        : results,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/competitions/:id/rankings', async (req, res) => {
  try {
    const result = await RankingService.getCompetitionRankings(
      parseInt(req.params.id, 10)
    );

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Delete competition
router.delete('/competitions/:id', isAdmin, async (req, res) => {
  try {
    const sql = 'DELETE FROM competitions WHERE id = ?';
    const result = await query(sql, [parseInt(req.params.id, 10)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Competition not found' });
    }

    res.json({ success: true, message: 'Competition deleted successfully' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
