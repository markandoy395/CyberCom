import { query } from '../config/database.js';
import ChallengeService from './ChallengeService.js';

const DEFAULT_LIMIT = 100;
const MAX_HISTORY_LIMIT = 500;
const MONITORING_TABLE_MISSING_ERROR_CODE = 'ER_NO_SUCH_TABLE';
const CATEGORY_KEYS = {
  1: 'web',
  2: 'crypto',
  3: 'forensics',
  4: 'reverse',
  5: 'binary',
};
const DIFFICULTY_BASE_MINUTES = {
  easy: 20,
  medium: 45,
  hard: 90,
  expert: 180,
};
const CATEGORY_MULTIPLIERS = {
  osint: 0.9,
  web: 1.0,
  misc: 1.0,
  crypto: 1.2,
  forensics: 1.2,
  reverse: 1.5,
  binary: 1.7,
  pwn: 1.7,
};
const PASTE_BEFORE_CORRECT_WINDOW_SECONDS = 30;
const FAST_REVIEW_MULTIPLIER = 0.35;
const SUSPICIOUS_FAST_MULTIPLIER = 0.15;
const ADVANCED_DIFFICULTIES = new Set(['medium', 'hard', 'expert']);
const EVENT_DEFAULTS = {
  challenge_opened: {
    title: 'Opened challenge',
    severity: 'info',
  },
  challenge_closed: {
    title: 'Closed challenge',
    severity: 'info',
  },
  submission_correct: {
    title: 'Submitted correct flag',
    severity: 'success',
  },
  submission_incorrect: {
    title: 'Submitted incorrect flag',
    severity: 'warning',
  },
  window_blur: {
    title: 'Window lost focus',
    severity: 'warning',
  },
  window_focus: {
    title: 'Window focused',
    severity: 'info',
  },
  tab_hidden: {
    title: 'Tab hidden',
    severity: 'warning',
  },
  tab_visible: {
    title: 'Tab visible',
    severity: 'info',
  },
  copy: {
    title: 'Copied content',
    severity: 'warning',
  },
  paste: {
    title: 'Pasted content',
    severity: 'warning',
  },
};

const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDate = value => {
  if (!value) {
    return new Date();
  }

  const parsed = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toSerializableJson = value => {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const parseJsonValue = value => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const pluralize = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

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

const isMonitoringTableMissingError = error => (
  error?.code === MONITORING_TABLE_MISSING_ERROR_CODE
  || /doesn't exist/i.test(error?.message || '')
  || /Unknown table/i.test(error?.message || '')
);

const describeRiskLevel = score => {
  if (score >= 80) {
    return { key: 'high-risk', label: 'High Risk' };
  }

  if (score >= 60) {
    return { key: 'monitor', label: 'Monitor' };
  }

  if (score >= 30) {
    return { key: 'watch', label: 'Watch' };
  }

  return { key: 'normal', label: 'Normal' };
};

export class ParticipantMonitoringService {
  static async recordEvent(event = {}, executor = query) {
    const competitionId = toIntOrNull(event.competitionId);
    const teamMemberId = toIntOrNull(event.memberId || event.teamMemberId);
    const teamId = toIntOrNull(event.teamId);
    const metadata = parseJsonValue(event.metadata) || event.metadata || null;
    const challengeId = toIntOrNull(
      event.challengeId
      || event.eventChallengeId
      || metadata?.challengeId
      || metadata?.id
    );

    if (!competitionId || !teamMemberId || !event.type) {
      return { success: false, skipped: true };
    }

    const defaults = EVENT_DEFAULTS[event.type] || {};
    const occurredAt = normalizeDate(event.occurredAt);

    try {
      await run(
        executor,
        `INSERT INTO competition_participant_audit_events (
           competition_id,
           team_id,
           team_member_id,
           challenge_id,
           event_type,
           severity,
           title,
           description,
           metadata,
           occurred_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          competitionId,
          teamId,
          teamMemberId,
          challengeId,
          event.type,
          event.severity || defaults.severity || 'info',
          event.title || defaults.title || 'Participant activity',
          event.description || '',
          toSerializableJson(metadata),
          occurredAt,
        ]
      );

      if (challengeId) {
        await this.updateChallengeAudit(
          {
            competitionId,
            teamId,
            teamMemberId,
            challengeId,
            type: event.type,
            occurredAt,
            metadata: metadata || null,
          },
          executor
        );
      }

      return { success: true };
    } catch (error) {
      if (isMonitoringTableMissingError(error)) {
        this.warnMissingTablesOnce(error);
        return { success: false, skipped: true };
      }

      console.warn('[ParticipantMonitoring] Failed to record event:', error);

      return { success: false, error: error.message };
    }
  }

  static async updateChallengeAudit(payload = {}, executor = query) {
    const competitionId = toIntOrNull(payload.competitionId);
    const teamId = toIntOrNull(payload.teamId);
    const teamMemberId = toIntOrNull(payload.teamMemberId);
    const challengeId = toIntOrNull(payload.challengeId);

    if (!competitionId || !teamId || !teamMemberId || !challengeId) {
      return null;
    }

    const challengeContext = await this.ensureChallengeAuditRow(
      {
        competitionId,
        teamId,
        teamMemberId,
        challengeId,
      },
      executor
    );

    if (!challengeContext) {
      return null;
    }

    const eventType = payload.type;
    const occurredAt = normalizeDate(payload.occurredAt);
    const metadata = payload.metadata || {};
    const updates = [];
    const values = [];

    if (eventType === 'challenge_opened') {
      if (!challengeContext.first_opened_at) {
        updates.push('first_opened_at = ?');
        values.push(occurredAt);
      } else {
        updates.push('reopen_count = reopen_count + 1');
      }

      updates.push('last_opened_at = ?');
      values.push(occurredAt);
    }

    if (eventType === 'challenge_closed') {
      updates.push('last_closed_at = ?');
      values.push(occurredAt);
    }

    if (eventType === 'window_blur') {
      updates.push('focus_loss_count = focus_loss_count + 1');
    }

    if (eventType === 'tab_hidden') {
      updates.push('tab_hidden_count = tab_hidden_count + 1');
    }

    if (eventType === 'copy') {
      updates.push('copy_count = copy_count + 1');
      updates.push('last_copy_at = ?');
      values.push(occurredAt);
    }

    if (eventType === 'paste') {
      updates.push('paste_count = paste_count + 1');
      updates.push('last_paste_at = ?');
      values.push(occurredAt);
    }

    if (eventType === 'submission_incorrect') {
      updates.push('incorrect_submission_count = incorrect_submission_count + 1');
    }

    if (eventType === 'submission_correct') {
      if (!challengeContext.correct_submitted_at) {
        updates.push('correct_submitted_at = ?');
        values.push(occurredAt);
      }

      const attemptNumber = toIntOrNull(metadata?.attemptNumber || metadata?.attempt_number);

      if (attemptNumber && !challengeContext.attempts_before_correct) {
        updates.push('attempts_before_correct = ?');
        values.push(attemptNumber);
      }
    }

    if (updates.length > 0) {
      values.push(challengeContext.id);
      await run(
        executor,
        `UPDATE competition_participant_challenge_audits
         SET ${updates.join(', ')}
         WHERE id = ?`,
        values
      );
    }

    const refreshedRow = await getRow(
      executor,
      `SELECT *
       FROM competition_participant_challenge_audits
       WHERE id = ?
       LIMIT 1`,
      [challengeContext.id]
    );

    if (!refreshedRow) {
      return null;
    }

    return this.refreshDerivedChallengeFields(refreshedRow, executor);
  }

  static async ensureChallengeAuditRow(payload = {}, executor = query) {
    const competitionId = toIntOrNull(payload.competitionId);
    const teamId = toIntOrNull(payload.teamId);
    const teamMemberId = toIntOrNull(payload.teamMemberId);
    const challengeId = toIntOrNull(payload.challengeId);

    if (!competitionId || !teamId || !teamMemberId || !challengeId) {
      return null;
    }

    const existing = await getRow(
      executor,
      `SELECT *
       FROM competition_participant_challenge_audits
       WHERE competition_id = ?
       AND team_member_id = ?
       AND challenge_id = ?
       LIMIT 1`,
      [competitionId, teamMemberId, challengeId]
    );

    if (existing) {
      return existing;
    }

    const challenge = await this.getChallengeContext(challengeId, executor);

    if (!challenge) {
      return null;
    }

    const expectedSolveMinutes = this.getExpectedSolveMinutes(
      challenge.difficulty,
      challenge.category_id,
      challenge.category_name
    );

    await run(
      executor,
      `INSERT INTO competition_participant_challenge_audits (
         competition_id,
         team_id,
         team_member_id,
         challenge_id,
         challenge_title,
         category_id,
         category_name,
         difficulty,
         expected_solve_minutes,
         suspicion_reasons
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         team_id = VALUES(team_id),
         challenge_title = VALUES(challenge_title),
         category_id = VALUES(category_id),
         category_name = VALUES(category_name),
         difficulty = VALUES(difficulty),
         expected_solve_minutes = VALUES(expected_solve_minutes),
         updated_at = CURRENT_TIMESTAMP`,
      [
        competitionId,
        teamId,
        teamMemberId,
        challengeId,
        challenge.title,
        challenge.category_id,
        challenge.category_name,
        challenge.difficulty,
        expectedSolveMinutes,
        JSON.stringify([]),
      ]
    );

    return getRow(
      executor,
      `SELECT *
       FROM competition_participant_challenge_audits
       WHERE competition_id = ?
       AND team_member_id = ?
       AND challenge_id = ?
       LIMIT 1`,
      [competitionId, teamMemberId, challengeId]
    );
  }

  static async refreshDerivedChallengeFields(auditRow, executor = query) {
    const assessment = this.buildChallengeAssessment(auditRow);

    await run(
      executor,
      `UPDATE competition_participant_challenge_audits
       SET time_to_first_correct_seconds = ?,
           solve_speed_ratio = ?,
           suspicion_score = ?,
           suspicion_reasons = ?,
           monitor_recommended = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        assessment.timeToFirstCorrectSeconds,
        assessment.solveSpeedRatio,
        assessment.score,
        JSON.stringify(assessment.reasons),
        assessment.monitorRecommended ? 1 : 0,
        auditRow.id,
      ]
    );

    return {
      ...auditRow,
      time_to_first_correct_seconds: assessment.timeToFirstCorrectSeconds,
      solve_speed_ratio: assessment.solveSpeedRatio,
      suspicion_score: assessment.score,
      suspicion_reasons: JSON.stringify(assessment.reasons),
      monitor_recommended: assessment.monitorRecommended ? 1 : 0,
    };
  }

  static buildChallengeAssessment(auditRow = {}) {
    const firstOpenedAt = auditRow.first_opened_at ? new Date(auditRow.first_opened_at) : null;
    const correctSubmittedAt = auditRow.correct_submitted_at
      ? new Date(auditRow.correct_submitted_at)
      : null;
    const lastPasteAt = auditRow.last_paste_at ? new Date(auditRow.last_paste_at) : null;
    const expectedSolveMinutes = Number(auditRow.expected_solve_minutes) || 0;
    const difficulty = String(auditRow.difficulty || '').toLowerCase();
    const attemptsBeforeCorrect = toIntOrNull(auditRow.attempts_before_correct);
    const focusLossCount = toIntOrNull(auditRow.focus_loss_count) || 0;
    const tabHiddenCount = toIntOrNull(auditRow.tab_hidden_count) || 0;
    const reopenCount = toIntOrNull(auditRow.reopen_count) || 0;
    const timeToFirstCorrectSeconds = (
      firstOpenedAt
      && correctSubmittedAt
      && !Number.isNaN(firstOpenedAt.getTime())
      && !Number.isNaN(correctSubmittedAt.getTime())
    )
      ? Math.max(
          Math.round((correctSubmittedAt.getTime() - firstOpenedAt.getTime()) / 1000),
          0
        )
      : null;
    const timeToFirstCorrectMinutes = timeToFirstCorrectSeconds === null
      ? null
      : timeToFirstCorrectSeconds / 60;
    const solveSpeedRatio = (
      expectedSolveMinutes > 0
      && timeToFirstCorrectMinutes !== null
    )
      ? Number((timeToFirstCorrectMinutes / expectedSolveMinutes).toFixed(4))
      : null;
    const suspiciousFastThreshold = expectedSolveMinutes * SUSPICIOUS_FAST_MULTIPLIER;
    const fastReviewThreshold = expectedSolveMinutes * FAST_REVIEW_MULTIPLIER;
    const pastedShortlyBeforeCorrect = (
      correctSubmittedAt
      && lastPasteAt
      && !Number.isNaN(correctSubmittedAt.getTime())
      && !Number.isNaN(lastPasteAt.getTime())
      && (correctSubmittedAt.getTime() - lastPasteAt.getTime()) >= 0
      && (correctSubmittedAt.getTime() - lastPasteAt.getTime()) <= PASTE_BEFORE_CORRECT_WINDOW_SECONDS * 1000
    );
    const solvedOnFirstTry = attemptsBeforeCorrect === 1;
    const fastFirstTrySolve = (
      solvedOnFirstTry
      && timeToFirstCorrectMinutes !== null
      && expectedSolveMinutes > 0
      && timeToFirstCorrectMinutes <= fastReviewThreshold
    );
    const reasons = [];
    let score = 0;

    if (
      timeToFirstCorrectMinutes !== null
      && expectedSolveMinutes > 0
      && timeToFirstCorrectMinutes <= suspiciousFastThreshold
    ) {
      score += 40;
      reasons.push(
        `Solved in ${timeToFirstCorrectMinutes.toFixed(1)} min vs expected ${expectedSolveMinutes.toFixed(1)} min`
      );
    } else if (
      timeToFirstCorrectMinutes !== null
      && expectedSolveMinutes > 0
      && timeToFirstCorrectMinutes <= fastReviewThreshold
    ) {
      score += 15;
      reasons.push(
        `Solved faster than review threshold (${timeToFirstCorrectMinutes.toFixed(1)} min)`
      );
    }

    if (attemptsBeforeCorrect === 1 && ADVANCED_DIFFICULTIES.has(difficulty)) {
      score += 20;
      reasons.push(`First-try correct on ${difficulty} difficulty`);
    }

    if (fastFirstTrySolve) {
      score += 15;
      reasons.push('First-try correct with unusually low review time');
    }

    if (pastedShortlyBeforeCorrect) {
      score += 20;
      reasons.push('Paste detected shortly before correct submission');
    }

    if (correctSubmittedAt && focusLossCount >= 3) {
      score += 10;
      reasons.push(`${focusLossCount} focus losses before solve`);
    }

    if (correctSubmittedAt && tabHiddenCount >= 3) {
      score += 10;
      reasons.push(`${tabHiddenCount} hidden tab events before solve`);
    }

    if (correctSubmittedAt && reopenCount >= 2) {
      score += 10;
      reasons.push(`${reopenCount} challenge reopens before solve`);
    }

    const normalizedScore = Math.min(score, 100);

    return {
      expectedSolveMinutes,
      fastReviewThreshold,
      suspiciousFastThreshold,
      pastedShortlyBeforeCorrect,
      timeToFirstCorrectSeconds,
      timeToFirstCorrectMinutes,
      solveSpeedRatio,
      score: normalizedScore,
      reasons,
      riskLevel: describeRiskLevel(normalizedScore),
      monitorRecommended: normalizedScore >= 60,
    };
  }

  static buildPrimaryChallengeSummary(auditRow = {}, challengeAssessment = {}) {
    const categoryKey = this.getCategoryKey(auditRow.category_id, auditRow.category_name);
    const fallbackCategoryName = categoryKey
      ? `${categoryKey.charAt(0).toUpperCase()}${categoryKey.slice(1)}`
      : 'Unknown';

    return {
      challengeId: toIntOrNull(auditRow.challenge_id),
      title: auditRow.challenge_title || `Challenge #${auditRow.challenge_id || '?'}`,
      categoryKey,
      categoryName: String(auditRow.category_name || fallbackCategoryName),
      difficulty: String(auditRow.difficulty || '').toLowerCase() || null,
      expectedSolveMinutes: challengeAssessment.expectedSolveMinutes || 0,
      timeToFirstCorrectSeconds: challengeAssessment.timeToFirstCorrectSeconds,
      solveSpeedRatio: challengeAssessment.solveSpeedRatio,
      attemptsBeforeCorrect: toIntOrNull(auditRow.attempts_before_correct),
      incorrectSubmissionCount: toIntOrNull(auditRow.incorrect_submission_count) || 0,
      focusLossCount: toIntOrNull(auditRow.focus_loss_count) || 0,
      tabHiddenCount: toIntOrNull(auditRow.tab_hidden_count) || 0,
      copyCount: toIntOrNull(auditRow.copy_count) || 0,
      pasteCount: toIntOrNull(auditRow.paste_count) || 0,
      reopenCount: toIntOrNull(auditRow.reopen_count) || 0,
      firstOpenedAt: auditRow.first_opened_at || null,
      correctSubmittedAt: auditRow.correct_submitted_at || null,
      score: challengeAssessment.score || 0,
      monitorRecommended: Boolean(challengeAssessment.monitorRecommended),
      reasons: [...(challengeAssessment.reasons || [])],
    };
  }

  static async getParticipantEventHistory(teamMemberId, limit = DEFAULT_LIMIT, executor = query) {
    const normalizedMemberId = toIntOrNull(teamMemberId);

    if (!normalizedMemberId) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(toIntOrNull(limit) || DEFAULT_LIMIT, MAX_HISTORY_LIMIT));

    try {
      const rows = await run(
        executor,
        `SELECT
           id,
           event_type AS type,
           severity,
           title,
           description,
           team_member_id AS memberId,
           team_id AS teamId,
           competition_id AS competitionId,
           challenge_id AS challengeId,
           metadata,
           occurred_at AS occurredAt
         FROM competition_participant_audit_events
         WHERE team_member_id = ?
         ORDER BY occurred_at DESC, id DESC
         LIMIT ?`,
        [normalizedMemberId, safeLimit]
      );

      return (rows || []).map(row => ({
        ...row,
        metadata: parseJsonValue(row.metadata),
      }));
    } catch (error) {
      if (isMonitoringTableMissingError(error)) {
        this.warnMissingTablesOnce(error);
        return [];
      }

      throw error;
    }
  }

  static async getRiskSummariesForParticipants(participants = [], executor = query) {
    const participantKeys = participants
      .map(participant => ({
        teamMemberId: toIntOrNull(participant.teamMemberId),
        competitionId: toIntOrNull(participant.competitionId),
      }))
      .filter(entry => entry.teamMemberId && entry.competitionId);

    if (!participantKeys.length) {
      return {
        summaries: new Map(),
        databaseConnected: true,
        unavailableReason: null,
      };
    }

    const memberIds = [...new Set(participantKeys.map(entry => entry.teamMemberId))];
    const competitionIds = [...new Set(participantKeys.map(entry => entry.competitionId))];
    const memberPlaceholders = memberIds.map(() => '?').join(', ');
    const competitionPlaceholders = competitionIds.map(() => '?').join(', ');

    try {
      const rows = await run(
        executor,
        `SELECT *
         FROM competition_participant_challenge_audits
         WHERE team_member_id IN (${memberPlaceholders})
         AND competition_id IN (${competitionPlaceholders})`,
        [...memberIds, ...competitionIds]
      );

      const grouped = new Map();

      for (const row of rows || []) {
        const key = `${row.competition_id}:${row.team_member_id}`;
        const existingRows = grouped.get(key) || [];

        existingRows.push(row);
        grouped.set(key, existingRows);
      }

      const result = new Map();

      for (const entry of participantKeys) {
        const key = `${entry.competitionId}:${entry.teamMemberId}`;
        const audits = grouped.get(key) || [];

        result.set(key, this.buildParticipantAssessment(audits));
      }

      return {
        summaries: result,
        databaseConnected: true,
        unavailableReason: null,
      };
    } catch (error) {
      if (isMonitoringTableMissingError(error)) {
        this.warnMissingTablesOnce(error);
        return {
          summaries: new Map(),
          databaseConnected: false,
          unavailableReason: 'missing_tables',
        };
      }

      console.warn('[ParticipantMonitoring] Failed to load risk summaries:', error);

      return {
        summaries: new Map(),
        databaseConnected: false,
        unavailableReason: 'query_failed',
      };
    }
  }

  static buildParticipantAssessment(audits = []) {
    if (!audits.length) {
      const riskLevel = describeRiskLevel(0);

      return {
        score: 0,
        statusKey: riskLevel.key,
        statusLabel: riskLevel.label,
        monitorRecommended: false,
        reasons: [],
        metrics: {
          totalAuditedChallenges: 0,
          solvedChallenges: 0,
          suspiciousFastSolves: 0,
          fastReviewSolves: 0,
          firstTryAdvancedSolves: 0,
          pasteBeforeCorrectSolves: 0,
          tabSwitchHeavySolves: 0,
          focusLossEvents: 0,
          tabHiddenEvents: 0,
          copyEvents: 0,
          pasteEvents: 0,
        },
        primaryChallenge: null,
        topChallenges: [],
      };
    }

    const assessments = audits.map(row => {
      const challengeAssessment = this.buildChallengeAssessment(row);

      return {
        row,
        challengeAssessment,
      };
    });
    let score = assessments.reduce(
      (total, item) => total + (item.challengeAssessment.score || 0),
      0
    );

    const suspiciousFastSolves = assessments.filter(item => (
      item.challengeAssessment.timeToFirstCorrectMinutes !== null
      && item.challengeAssessment.expectedSolveMinutes > 0
      && item.challengeAssessment.timeToFirstCorrectMinutes <= item.challengeAssessment.suspiciousFastThreshold
    ));
    const fastReviewSolves = assessments.filter(item => (
      ADVANCED_DIFFICULTIES.has(String(item.row.difficulty || '').toLowerCase())
      && item.challengeAssessment.timeToFirstCorrectMinutes !== null
      && item.challengeAssessment.expectedSolveMinutes > 0
      && item.challengeAssessment.timeToFirstCorrectMinutes <= item.challengeAssessment.fastReviewThreshold
    ));
    const firstTryAdvancedSolves = assessments.filter(item => (
      toIntOrNull(item.row.attempts_before_correct) === 1
      && ADVANCED_DIFFICULTIES.has(String(item.row.difficulty || '').toLowerCase())
    ));
    const pasteBeforeCorrectSolves = assessments.filter(
      item => item.challengeAssessment.pastedShortlyBeforeCorrect
    );
    const tabSwitchHeavySolves = assessments.filter(item => (
      (toIntOrNull(item.row.focus_loss_count) || 0) >= 3
      || (toIntOrNull(item.row.tab_hidden_count) || 0) >= 3
    ));
    const repeatedPatternSolves = assessments.filter(item => (
      item.challengeAssessment.timeToFirstCorrectMinutes !== null
      && (
        item.challengeAssessment.pastedShortlyBeforeCorrect
        || (
          toIntOrNull(item.row.attempts_before_correct) === 1
          && ADVANCED_DIFFICULTIES.has(String(item.row.difficulty || '').toLowerCase())
        )
        || (toIntOrNull(item.row.focus_loss_count) || 0) >= 3
        || (toIntOrNull(item.row.tab_hidden_count) || 0) >= 3
      )
    ));

    if (suspiciousFastSolves.length >= 3) {
      score += 30;
    }

    if (repeatedPatternSolves.length >= 3) {
      score += 30;
    }

    if (fastReviewSolves.length >= 3) {
      score += 20;
    }

    score = Math.min(score, 100);

    const totalAuditedChallenges = assessments.length;
    const solvedChallenges = assessments.filter(item => item.row.correct_submitted_at).length;
    const focusLossEvents = assessments.reduce(
      (total, item) => total + (toIntOrNull(item.row.focus_loss_count) || 0),
      0
    );
    const tabHiddenEvents = assessments.reduce(
      (total, item) => total + (toIntOrNull(item.row.tab_hidden_count) || 0),
      0
    );
    const copyEvents = assessments.reduce(
      (total, item) => total + (toIntOrNull(item.row.copy_count) || 0),
      0
    );
    const pasteEvents = assessments.reduce(
      (total, item) => total + (toIntOrNull(item.row.paste_count) || 0),
      0
    );

    const sortedAssessments = [...assessments].sort((left, right) => {
      const scoreDifference = (right.challengeAssessment.score || 0)
        - (left.challengeAssessment.score || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const rightSolvedAt = right.row.correct_submitted_at
        ? new Date(right.row.correct_submitted_at).getTime()
        : 0;
      const leftSolvedAt = left.row.correct_submitted_at
        ? new Date(left.row.correct_submitted_at).getTime()
        : 0;

      if (rightSolvedAt !== leftSolvedAt) {
        return rightSolvedAt - leftSolvedAt;
      }

      const rightOpenedAt = right.row.last_opened_at
        ? new Date(right.row.last_opened_at).getTime()
        : 0;
      const leftOpenedAt = left.row.last_opened_at
        ? new Date(left.row.last_opened_at).getTime()
        : 0;

      return rightOpenedAt - leftOpenedAt;
    });
    const primaryAssessment = sortedAssessments[0] || null;

    const reasons = [];

    if (suspiciousFastSolves.length > 0) {
      reasons.push(
        `${pluralize(suspiciousFastSolves.length, 'suspicious-fast solve')} across monitored challenges`
      );
    }

    if (firstTryAdvancedSolves.length > 0) {
      reasons.push(
        `${pluralize(firstTryAdvancedSolves.length, 'first-try correct submission')} on medium/hard challenges`
      );
    }

    if (pasteBeforeCorrectSolves.length > 0) {
      reasons.push(
        `Paste detected shortly before ${pluralize(pasteBeforeCorrectSolves.length, 'correct solve')}`
      );
    }

    if (tabSwitchHeavySolves.length > 0) {
      reasons.push(
        `Frequent tab switching before ${pluralize(tabSwitchHeavySolves.length, 'solve')}`
      );
    }

    const riskLevel = describeRiskLevel(score);
    const monitorRecommended = (
      score >= 60
      || suspiciousFastSolves.length >= 2
      || (suspiciousFastSolves.length >= 1 && pasteBeforeCorrectSolves.length >= 1)
      || fastReviewSolves.length >= 3
      || repeatedPatternSolves.length >= 3
    );
    const topChallenges = sortedAssessments.slice(0, 3).map(item => (
      this.buildPrimaryChallengeSummary(item.row, item.challengeAssessment)
    ));

    return {
      score,
      statusKey: riskLevel.key,
      statusLabel: riskLevel.label,
      monitorRecommended,
      reasons: reasons.slice(0, 4),
      metrics: {
        totalAuditedChallenges,
        solvedChallenges,
        suspiciousFastSolves: suspiciousFastSolves.length,
        fastReviewSolves: fastReviewSolves.length,
        firstTryAdvancedSolves: firstTryAdvancedSolves.length,
        pasteBeforeCorrectSolves: pasteBeforeCorrectSolves.length,
        tabSwitchHeavySolves: tabSwitchHeavySolves.length,
        focusLossEvents,
        tabHiddenEvents,
        copyEvents,
        pasteEvents,
      },
      primaryChallenge: primaryAssessment
        ? this.buildPrimaryChallengeSummary(
          primaryAssessment.row,
          primaryAssessment.challengeAssessment
        )
        : null,
      topChallenges,
    };
  }

  static async getChallengeContext(challengeId, executor = query) {
    const normalizedChallengeId = toIntOrNull(challengeId);

    if (!normalizedChallengeId) {
      return null;
    }

    const row = await getRow(
      executor,
      `SELECT ch.id, ch.title, ch.category_id, ch.difficulty, cat.name AS category_name
       FROM challenges ch
       LEFT JOIN categories cat ON cat.id = ch.category_id
       WHERE ch.id = ?
       LIMIT 1`,
      [normalizedChallengeId]
    );

    if (!row) {
      return null;
    }

    const decryptedChallenge = ChallengeService.decryptChallenge({ title: row.title });

    return {
      ...row,
      title: decryptedChallenge?.title || `Challenge #${normalizedChallengeId}`,
      difficulty: String(row.difficulty || 'easy').toLowerCase(),
    };
  }

  static getExpectedSolveMinutes(difficulty, categoryId, categoryName = '') {
    const normalizedDifficulty = String(difficulty || 'easy').toLowerCase();
    const baseMinutes = DIFFICULTY_BASE_MINUTES[normalizedDifficulty] || DIFFICULTY_BASE_MINUTES.easy;
    const categoryKey = this.getCategoryKey(categoryId, categoryName);
    const categoryMultiplier = CATEGORY_MULTIPLIERS[categoryKey] || 1.0;

    return Number((baseMinutes * categoryMultiplier).toFixed(2));
  }

  static getCategoryKey(categoryId, categoryName = '') {
    const byId = CATEGORY_KEYS[toIntOrNull(categoryId)];

    if (byId) {
      return byId;
    }

    const normalizedName = String(categoryName || '').trim().toLowerCase();

    if (normalizedName.includes('crypto')) {
      return 'crypto';
    }

    if (normalizedName.includes('forensic')) {
      return 'forensics';
    }

    if (normalizedName.includes('reverse')) {
      return 'reverse';
    }

    if (normalizedName.includes('binary') || normalizedName.includes('pwn')) {
      return 'binary';
    }

    if (normalizedName.includes('osint')) {
      return 'osint';
    }

    if (normalizedName.includes('misc')) {
      return 'misc';
    }

    return 'web';
  }

  static warnMissingTablesOnce(error) {
    if (this.warnedMissingTables) {
      return;
    }

    this.warnedMissingTables = true;
    console.warn(
      '[ParticipantMonitoring] Monitoring tables are missing. Run backend-node/scripts/add-participant-monitoring.sql',
      error?.message || ''
    );
  }
}

ParticipantMonitoringService.warnedMissingTables = false;

export default ParticipantMonitoringService;
