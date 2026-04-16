import { getConnection, query } from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import CompetitionStatusService from './CompetitionStatusService.js';
import RankingService from './RankingService.js';
import LiveMonitorService from '../live-monitor/LiveMonitorService.js';
import LiveMonitorActivityService from './LiveMonitorActivityService.js';
import ParticipantMonitoringService from './ParticipantMonitoringService.js';
import TeamService from './TeamService.js';
import { calculateLinearExponentialDecayScore } from '../scoring/linear-exponential-decay/index.js';

const MAX_SUBMISSION_ATTEMPTS = 10;
const SUBMISSION_STATUS = {
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  LIMIT_REACHED: 'limit_reached',
  ALREADY_SOLVED: 'already_solved',
};
const ok = payload => ({ success: true, ...payload });
const fail = error => ({ success: false, error: error.message });
const safeDecrypt = value => {
  try {
    return decrypt(value);
  } catch {
    return value;
  }
};
const buildAttemptSummary = (attemptsUsed, options = {}) => {
  const { lastStatus = null, teamSolved = false } = options;
  const safeAttemptsUsed = Number.parseInt(attemptsUsed, 10) || 0;

  return {
    attempts_used: safeAttemptsUsed,
    attempts_remaining: Math.max(MAX_SUBMISSION_ATTEMPTS - safeAttemptsUsed, 0),
    max_attempts: MAX_SUBMISSION_ATTEMPTS,
    attempts_exhausted: safeAttemptsUsed >= MAX_SUBMISSION_ATTEMPTS,
    last_status: lastStatus,
    team_solved: Boolean(teamSolved),
  };
};
const nullSafeCompetitionClause = '((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)';
const createConnectionQuery = connection => async (sql, params = []) => {
  const [result] = await connection.execute(sql, params);

  return result;
};
const sumDistinctSolvedPointsSql = scopeSql => `
  SELECT COALESCE(SUM(solved.points), 0) AS total_points
  FROM (
    SELECT s.challenge_id, MAX(s.awarded_points) AS points
    FROM submissions s
    WHERE ${scopeSql}
    AND s.is_correct = 1
    GROUP BY s.challenge_id
  ) solved
`;
const firstCorrectSubmissionSql = `
  SELECT
    s.id,
    s.team_member_id,
    s.submitted_at,
    tm.username AS team_member_username,
    tm.name AS team_member_name
  FROM submissions s
  LEFT JOIN team_members tm ON tm.id = s.team_member_id
  WHERE s.team_id = ?
    AND s.challenge_id = ?
    AND ${nullSafeCompetitionClause}
    AND s.is_correct = 1
  ORDER BY s.id ASC
  LIMIT 1
`;

export class SubmissionService {
  static getMinutesBetween(startValue, endValue) {
    if (!startValue || !endValue) {
      return 0;
    }

    const startTime = new Date(startValue).getTime();
    const endTime = new Date(endValue).getTime();

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return 0;
    }

    return Math.max((endTime - startTime) / 60000, 0);
  }

  static async calculateAwardedPointsForCorrectSubmission(connection, options) {
    const {
      challengeId,
      challengePoints,
      teamId,
      competitionId,
      competitionStartDate,
      competitionEndDate,
      scoringSettings,
      submissionOccurredAt,
    } = options;
    const basePoints = Number.parseInt(String(challengePoints), 10) || 0;

    // Keep practice mode simple:
    // if this submission is not tied to a competition, award the challenge's normal static points.
    if (!competitionId || basePoints <= 0) {
      return {
        awardedPoints: basePoints,
        scoreBreakdown: null,
      };
    }

    // For competition mode, compute the dynamic score inputs from live submission data.
    // `solveCount` uses distinct teams that already solved the challenge in this competition.
    // `attempts` uses the current team's attempts on this challenge in this competition.
    const [solverCountRows] = await connection.execute(
      `SELECT COUNT(DISTINCT s.team_id) AS solver_count
       FROM submissions s
       WHERE s.challenge_id = ?
       AND s.competition_id = ?
       AND s.is_correct = 1`,
      [challengeId, competitionId]
    );
    const [teamAttemptRows] = await connection.execute(
      `SELECT COUNT(*) AS attempts_used
       FROM submissions s
       WHERE s.team_id = ?
       AND s.challenge_id = ?
       AND s.competition_id = ?
       AND s.submission_status IN (?, ?)`,
      [
        teamId,
        challengeId,
        competitionId,
        SUBMISSION_STATUS.CORRECT,
        SUBMISSION_STATUS.INCORRECT,
      ]
    );

    const solveCount = (Number.parseInt(solverCountRows[0]?.solver_count, 10) || 0) + 1;
    const attempts = (Number.parseInt(teamAttemptRows[0]?.attempts_used, 10) || 0) + 1;
    const competitionDurationMinutes = this.getMinutesBetween(
      competitionStartDate,
      competitionEndDate
    );
    const solveTimeMinutes = this.getMinutesBetween(
      competitionStartDate,
      submissionOccurredAt
    );

    let parsedSettings = {};
    if (typeof scoringSettings === 'string') {
      try {
        parsedSettings = JSON.parse(scoringSettings);
      } catch (e) {
        // ignore
      }
    } else if (scoringSettings && typeof scoringSettings === 'object') {
      parsedSettings = scoringSettings;
    }

    // Apply the L-ED scoring model only for competition submissions.
    const scoreBreakdown = calculateLinearExponentialDecayScore({
      maxScore: basePoints,
      solveCount,
      solveTimeMinutes,
      attempts,
      competitionDurationMinutes,
      ...parsedSettings,
    });

    return {
      awardedPoints: scoreBreakdown.finalScore,
      scoreBreakdown,
    };
  }

  static sanitizeSubmissionRows(submissions = []) {
    return submissions.map(submission => {
      const sanitizedSubmission = { ...submission };

      if ('submitted_flag' in sanitizedSubmission) {
        sanitizedSubmission.has_submitted_flag = Boolean(sanitizedSubmission.submitted_flag);
        delete sanitizedSubmission.submitted_flag;
      }

      return sanitizedSubmission;
    });
  }

  static async getFirstCorrectSubmission(connection, teamId, challengeId, competitionId = null) {
    const [rows] = await connection.execute(
      firstCorrectSubmissionSql,
      [teamId, challengeId, competitionId, competitionId]
    );
    const [submission] = rows;

    return submission
      ? {
          submission_id: submission.id,
          team_member_id: submission.team_member_id,
          team_member_username: submission.team_member_username || null,
          team_member_name: submission.team_member_name || null,
          submitted_at: submission.submitted_at || null,
        }
      : null;
  }

  static async syncTeamAndMemberPoints(connection, teamId, teamMemberId, competitionId = null) {
    const [teamPointRows] = await connection.execute(
      sumDistinctSolvedPointsSql(
        's.team_id = ? AND ((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)'
      ),
      [teamId, competitionId, competitionId]
    );
    const teamPoints = Number.parseInt(teamPointRows[0]?.total_points, 10) || 0;

    await connection.execute(
      'UPDATE teams SET points = ?, score = ? WHERE id = ?',
      [teamPoints, teamPoints, teamId]
    );

    const [memberPointRows] = await connection.execute(
      sumDistinctSolvedPointsSql(
        's.team_member_id = ? AND s.team_id = ? AND ((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)'
      ),
      [teamMemberId, teamId, competitionId, competitionId]
    );
    const memberPoints = Number.parseInt(memberPointRows[0]?.total_points, 10) || 0;

    return { teamPoints, memberPoints };
  }

  static async getSubmissions(filters = {}) {
    try {
      const { sanitize = false } = filters;
      let sql = `SELECT s.*, c.title as challenge_title, t.name as team_name,
                 tm.username AS team_member_username, tm.name AS team_member_name
                 FROM submissions s
                 JOIN challenges c ON s.challenge_id = c.id
                 JOIN teams t ON s.team_id = t.id
                 LEFT JOIN team_members tm ON s.team_member_id = tm.id
                 WHERE 1=1`;
      const params = [];

      if (filters.competition_id) {
        sql += ' AND s.competition_id = ?';
        params.push(filters.competition_id);
      }

      if (filters.team_id) {
        sql += ' AND s.team_id = ?';
        params.push(filters.team_id);
      }

      if (filters.team_member_id) {
        sql += ' AND s.team_member_id = ?';
        params.push(filters.team_member_id);
      }

      if (filters.challenge_id) {
        sql += ' AND s.challenge_id = ?';
        params.push(filters.challenge_id);
      }

      if (filters.is_correct !== undefined) {
        sql += ' AND s.is_correct = ?';
        params.push(filters.is_correct ? 1 : 0);
      }

      sql += ' ORDER BY s.submitted_at DESC, s.id DESC';

      const results = await query(sql, params);

      return ok({
        data: sanitize
          ? this.sanitizeSubmissionRows(results)
          : results,
      });
    } catch (error) { return fail(error); }
  }

  static async getAttemptSummary(filters = {}) {
    try {
      const { team_id, challenge_id, competition_id = null } = filters;

      if (!team_id || !challenge_id) {
        return { success: false, error: 'team_id and challenge_id are required' };
      }

      const [attemptCountRow] = await query(
        `SELECT COUNT(*) AS attempts_used
         FROM submissions s
         WHERE s.team_id = ?
         AND s.challenge_id = ?
         AND ${nullSafeCompetitionClause}
         AND s.submission_status IN (?, ?)`,
        [
          team_id,
          challenge_id,
          competition_id,
          competition_id,
          SUBMISSION_STATUS.CORRECT,
          SUBMISSION_STATUS.INCORRECT,
        ]
      );
      const [lastSubmission] = await query(
        `SELECT submission_status
         FROM submissions s
         WHERE s.team_id = ?
         AND s.challenge_id = ?
         AND ${nullSafeCompetitionClause}
         ORDER BY s.id DESC
         LIMIT 1`,
        [team_id, challenge_id, competition_id, competition_id]
      );
      const [teamSolve] = await query(
        `SELECT id
         FROM submissions s
         WHERE s.team_id = ?
         AND s.challenge_id = ?
         AND ${nullSafeCompetitionClause}
         AND s.is_correct = 1
         LIMIT 1`,
        [team_id, challenge_id, competition_id, competition_id]
      );

      return ok({
        data: buildAttemptSummary(attemptCountRow?.attempts_used || 0, {
          lastStatus: lastSubmission?.submission_status || null,
          teamSolved: Boolean(teamSolve),
        }),
      });
    } catch (error) { return fail(error); }
  }

  static async submitFlag(submissionData) {
    const connection = await getConnection();
    const connectionQuery = createConnectionQuery(connection);

    try {
      const {
        team_id: teamId,
        team_member_id: teamMemberId,
        challenge_id: challengeId,
        competition_id: rawCompetitionId = null,
        flag: submittedFlag,
        device_fingerprint: deviceFingerprint = null,
        ip_address: ipAddress = null,
      } = submissionData;
      const competitionId = rawCompetitionId ?? null;

      if (!teamId || !teamMemberId || !challengeId || !submittedFlag) {
        return {
          success: false,
          error: 'team_id, team_member_id, challenge_id, and flag are required',
        };
      }

      await connection.beginTransaction();

      const [memberRows] = await connection.execute(
        `SELECT tm.id, tm.team_id, tm.status, t.competition_id
         FROM team_members tm
         INNER JOIN teams t ON tm.team_id = t.id
         WHERE tm.id = ?
         LIMIT 1`,
        [teamMemberId]
      );
      const [member] = memberRows;

      if (!member || member.team_id !== teamId) {
        await connection.rollback();

        return { success: false, error: 'Participant does not belong to the specified team' };
      }

      if (TeamService.isBlockedMemberStatus(member.status)) {
        await connection.rollback();

        return {
          success: false,
          error: TeamService.buildBlockedMemberMessage(member.status),
          errorCode: 'competition_access_revoked',
          memberStatus: member.status,
        };
      }

      const effectiveCompetitionId = competitionId ?? member.competition_id ?? null;
      let competition = null;

      if (effectiveCompetitionId && member.competition_id !== effectiveCompetitionId) {
        await connection.rollback();

        return { success: false, error: 'Participant is not assigned to the specified competition' };
      }

      if (effectiveCompetitionId) {
        await CompetitionStatusService.finalizeExpiredCompetition(
          effectiveCompetitionId,
          connectionQuery
        );

        const competitionRows = await connectionQuery(
          'SELECT id, status, start_date, end_date, solver_weight, time_weight, solver_decay_constant, attempt_penalty_constant, min_score_floor FROM competitions WHERE id = ? LIMIT 1',
          [effectiveCompetitionId]
        );
        [competition] = competitionRows;

        if (!competition) {
          await connection.rollback();

          return { success: false, error: 'Competition not found' };
        }

        const normalizedCompetitionStatus = CompetitionStatusService.normalizeStatus(
          competition.status
        );

        if (normalizedCompetitionStatus === 'upcoming') {
          await connection.rollback();

          return {
            success: false,
            error: 'This competition has not started yet. No submissions are allowed.',
          };
        }

        if (normalizedCompetitionStatus === 'paused') {
          await connection.rollback();

          return {
            success: false,
            error: 'This competition is currently paused. Please wait for the administrator to resume it.',
          };
        }

        if (
          normalizedCompetitionStatus === 'done'
          || normalizedCompetitionStatus === 'cancelled'
        ) {
          await connection.rollback();

          return {
            success: false,
            error: normalizedCompetitionStatus === 'cancelled'
              ? 'This competition has been cancelled. No submissions are allowed.'
              : 'This competition has ended. No new submissions are allowed.',
          };
        }
      }

      const challengeSql = effectiveCompetitionId
        ? `SELECT ch.id, ch.title, ch.flag, ch.points
           FROM challenges ch
           INNER JOIN competition_challenges cc ON cc.challenge_id = ch.id
           WHERE ch.id = ? AND cc.competition_id = ?
           LIMIT 1`
        : 'SELECT id, title, flag, points FROM challenges WHERE id = ? LIMIT 1';
      const challengeParams = effectiveCompetitionId
        ? [challengeId, effectiveCompetitionId]
        : [challengeId];
      const [challengeRows] = await connection.execute(challengeSql, challengeParams);
      const [challenge] = challengeRows;

      if (!challenge) {
        await connection.rollback();

        return { success: false, error: 'Challenge not found for this competition' };
      }

      const [teamSolveRows] = await connection.execute(
        `SELECT id
         FROM submissions s
         WHERE s.team_id = ?
         AND s.challenge_id = ?
         AND ((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)
         AND s.is_correct = 1
         LIMIT 1`,
        [teamId, challengeId, effectiveCompetitionId, effectiveCompetitionId]
      );

      if (teamSolveRows.length > 0) {
        const firstCorrectSubmission = await this.getFirstCorrectSubmission(
          connection,
          teamId,
          challengeId,
          effectiveCompetitionId
        );
        const [existingAttemptCountRows] = await connection.execute(
          `SELECT COUNT(*) AS attempts_used
           FROM submissions s
           WHERE s.team_id = ?
           AND s.challenge_id = ?
           AND ((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)
           AND s.submission_status IN (?, ?)`,
          [
            teamId,
            challengeId,
            effectiveCompetitionId,
            effectiveCompetitionId,
            SUBMISSION_STATUS.CORRECT,
            SUBMISSION_STATUS.INCORRECT,
          ]
        );

        await connection.rollback();
        LiveMonitorActivityService.recordEvent({
          type: 'submission_blocked',
          memberId: teamMemberId,
          teamId,
          competitionId: effectiveCompetitionId,
          description: `Challenge ${safeDecrypt(challenge.title)} is already solved by the team`,
          metadata: {
            challengeId,
            status: SUBMISSION_STATUS.ALREADY_SOLVED,
          },
        });

        return {
          success: false,
          status: SUBMISSION_STATUS.ALREADY_SOLVED,
          error: 'This challenge is already solved by your team',
          data: {
            ...buildAttemptSummary(existingAttemptCountRows[0]?.attempts_used || 0, {
              lastStatus: SUBMISSION_STATUS.ALREADY_SOLVED,
              teamSolved: true,
            }),
            first_solver: firstCorrectSubmission,
          },
        };
      }

      const [attemptCountRows] = await connection.execute(
        `SELECT COUNT(*) AS attempts_used
         FROM submissions s
         WHERE s.team_id = ?
         AND s.challenge_id = ?
         AND ((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)
         AND s.submission_status IN (?, ?)`,
        [
          teamId,
          challengeId,
          effectiveCompetitionId,
          effectiveCompetitionId,
          SUBMISSION_STATUS.CORRECT,
          SUBMISSION_STATUS.INCORRECT,
        ]
      );
      const attemptsUsed = attemptCountRows[0]?.attempts_used || 0;

      if (attemptsUsed >= MAX_SUBMISSION_ATTEMPTS) {
        await connection.rollback();
        LiveMonitorActivityService.recordEvent({
          type: 'submission_blocked',
          memberId: teamMemberId,
          teamId,
          competitionId: effectiveCompetitionId,
          description: `Maximum attempts reached for ${safeDecrypt(challenge.title)}`,
          metadata: {
            challengeId,
            status: SUBMISSION_STATUS.LIMIT_REACHED,
          },
        });

        return {
          success: false,
          status: SUBMISSION_STATUS.LIMIT_REACHED,
          error: 'Maximum attempts reached for this challenge',
          data: buildAttemptSummary(attemptsUsed, {
            lastStatus: SUBMISSION_STATUS.LIMIT_REACHED,
          }),
        };
      }

      const decryptedFlag = safeDecrypt(challenge.flag);
      const trimmedSubmittedFlag = submittedFlag.trim();
      const isCorrect = trimmedSubmittedFlag === decryptedFlag.trim();
      const submissionOccurredAt = new Date();
      const { awardedPoints, scoreBreakdown } = isCorrect
        ? await this.calculateAwardedPointsForCorrectSubmission(connection, {
          challengeId,
          challengePoints: safeDecrypt(challenge.points),
          teamId,
          competitionId: effectiveCompetitionId,
          competitionStartDate: competition?.start_date ?? null,
          competitionEndDate: competition?.end_date ?? null,
          scoringSettings: competition ? {
            solverWeight: competition.solver_weight,
            timeWeight: competition.time_weight,
            solverDecayConstant: competition.solver_decay_constant,
            attemptPenaltyConstant: competition.attempt_penalty_constant,
            minScoreFloor: competition.min_score_floor
          } : null,
          submissionOccurredAt,
        })
        : { awardedPoints: 0, scoreBreakdown: null };
      const encryptedSubmittedFlag = encrypt(trimmedSubmittedFlag);
      const attemptNumber = attemptsUsed + 1;
      const submissionStatus = isCorrect ? SUBMISSION_STATUS.CORRECT : SUBMISSION_STATUS.INCORRECT;
      const [result] = await connection.execute(
        `INSERT INTO submissions (
          competition_id, team_id, team_member_id, challenge_id, submitted_flag,
          is_correct, submission_status, awarded_points, attempt_number, ip_address, device_fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          effectiveCompetitionId,
          teamId,
          teamMemberId,
          challengeId,
          encryptedSubmittedFlag,
          isCorrect ? 1 : 0,
          submissionStatus,
          awardedPoints,
          attemptNumber,
          ipAddress,
          deviceFingerprint,
        ]
      );
      await ParticipantMonitoringService.recordEvent(
        {
          type: isCorrect ? 'submission_correct' : 'submission_incorrect',
          memberId: teamMemberId,
          teamId,
          competitionId: effectiveCompetitionId,
          challengeId,
          occurredAt: submissionOccurredAt,
          description: isCorrect
            ? `${safeDecrypt(challenge.title)} solved on attempt ${attemptNumber}`
            : `${safeDecrypt(challenge.title)} incorrect on attempt ${attemptNumber}`,
          metadata: {
            challengeId,
            challengeTitle: safeDecrypt(challenge.title) || `Challenge #${challengeId}`,
            attemptNumber,
            awardedPoints,
            scoringModel: scoreBreakdown?.model || null,
            submissionStatus,
          },
        },
        connection
      );
      await LiveMonitorService.recordSubmissionActivity(
        {
          teamMemberId,
          teamId,
          competitionId: effectiveCompetitionId,
          challengeId,
        },
        connection
      );

      let updatedPoints = null;

      if (isCorrect) {
        updatedPoints = await this.syncTeamAndMemberPoints(
          connection,
          teamId,
          teamMemberId,
          effectiveCompetitionId
        );

        if (effectiveCompetitionId) {
          await RankingService.rebuildCompetitionRankings(
            effectiveCompetitionId,
            connection
          );
        }
      }

      await connection.commit();
      const challengeTitle = safeDecrypt(challenge.title) || `Challenge #${challengeId}`;
      LiveMonitorActivityService.recordEvent({
        type: isCorrect ? 'submission_correct' : 'submission_incorrect',
        memberId: teamMemberId,
        teamId,
        competitionId: effectiveCompetitionId,
        description: isCorrect
          ? `${challengeTitle} solved on attempt ${attemptNumber}`
          : `${challengeTitle} incorrect on attempt ${attemptNumber}`,
        metadata: {
          challengeId,
          challengeTitle,
          status: submissionStatus,
          attemptNumber,
          awardedPoints,
          scoringModel: scoreBreakdown?.model || null,
        },
      });

      const summary = buildAttemptSummary(attemptNumber, {
        lastStatus: submissionStatus,
        teamSolved: isCorrect,
      });

      return {
        success: isCorrect,
        status: submissionStatus,
        submission: {
          id: result.insertId,
          competition_id: effectiveCompetitionId,
          team_id: teamId,
          team_member_id: teamMemberId,
          challenge_id: challengeId,
          is_correct: isCorrect,
          awarded_points: awardedPoints,
          attempt_number: attemptNumber,
          submission_status: submissionStatus,
          scoring_model: scoreBreakdown?.model || null,
          is_first_solver_for_team_challenge: isCorrect,
        },
        points: updatedPoints,
        data: summary,
        error: isCorrect ? null : 'Incorrect flag',
      };
    } catch (error) {
      try {
        await connection.rollback();
      } catch {
        // Ignore rollback errors and keep the original failure.
      }

      return fail(error);
    } finally {
      connection.release();
    }
  }

  static async getTeamScore(teamId) {
    try {
      const results = await query(
        `SELECT COUNT(*) AS correct_submissions, COALESCE(SUM(points), 0) AS total_points
         FROM (
           SELECT s.challenge_id, MAX(s.awarded_points) AS points
           FROM submissions s
           WHERE s.team_id = ? AND s.is_correct = 1
           GROUP BY s.challenge_id
         ) solved_challenges`,
        [teamId]
      );
      const [data] = results;

      return ok({
        data: {
          correct_submissions: data.correct_submissions,
          total_points: data.total_points || 0,
        },
      });
    } catch (error) { return fail(error); }
  }

  static async getLeaderboard(competitionId) {
    try {
      const results = await query(
        `SELECT solved.team_id AS id, t.name,
                COUNT(*) AS challenges_solved,
                COALESCE(SUM(solved.points), 0) AS total_points
         FROM (
           SELECT s.team_id, s.challenge_id, MAX(s.awarded_points) AS points
           FROM submissions s
           WHERE s.competition_id = ?
           AND s.is_correct = 1
           GROUP BY s.team_id, s.challenge_id
         ) solved
         INNER JOIN teams t ON t.id = solved.team_id
         GROUP BY solved.team_id, t.name
         ORDER BY total_points DESC, challenges_solved DESC, t.name ASC`,
        [competitionId]
      );

      return ok({ data: results });
    } catch (error) { return fail(error); }
  }
}

export default SubmissionService;
