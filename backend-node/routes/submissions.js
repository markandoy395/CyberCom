import express from 'express';
import { attachCompetitionMemberIfPresent } from '../middleware/competitionAuth.js';
import { serializeSubmissionByChallenge } from '../middleware/submissionOrdering.js';
import SubmissionService from '../services/SubmissionService.js';
import DeviceTracker from '../services/DeviceTracker.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();
const toInt = value => parseInt(value, 10);

// Get all submissions
router.get('/submissions', async (req, res) => {
  try {
    const filters = {
      sanitize: req.query.sanitize === '1',
      team_id: req.query.team_id ? toInt(req.query.team_id) : null,
      team_member_id: req.query.team_member_id ? toInt(req.query.team_member_id) : null,
      challenge_id: req.query.challenge_id ? toInt(req.query.challenge_id) : null,
      competition_id: req.query.competition_id ? toInt(req.query.competition_id) : null,
    };

    const result = await SubmissionService.getSubmissions(filters);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get attempt summary for a member on a challenge
router.get('/submissions/attempt-summary', attachCompetitionMemberIfPresent, async (req, res) => {
  try {
    const isCompetitionAttemptSummary = req.query.team_member_id || req.query.competition_id;

    if (isCompetitionAttemptSummary && !req.competitionMemberId) {
      return res.status(401).json({ success: false, error: 'Competition token required' });
    }

    const filters = {
      team_id: req.competitionMemberId
        ? req.competitionSessionTeamId
        : (req.query.team_id ? toInt(req.query.team_id) : null),
      team_member_id: req.competitionMemberId
        ? req.competitionMemberId
        : (req.query.team_member_id
          ? toInt(req.query.team_member_id)
          : (req.query.user_id ? toInt(req.query.user_id) : null)),
      challenge_id: req.query.challenge_id ? toInt(req.query.challenge_id) : null,
      competition_id: req.competitionMemberId
        ? req.competitionSessionCompetitionId
        : (req.query.competition_id ? toInt(req.query.competition_id) : null),
    };

    const result = await SubmissionService.getAttemptSummary(filters);

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get submissions by team
router.get('/teams/:team_id/submissions', async (req, res) => {
  try {
    const result = await SubmissionService.getSubmissions({
      team_id: toInt(req.params.team_id),
    });
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get team score
router.get('/teams/:team_id/score', async (req, res) => {
  try {
    const result = await SubmissionService.getTeamScore(toInt(req.params.team_id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Submit flag
router.post(
  '/submissions',
  attachCompetitionMemberIfPresent,
  serializeSubmissionByChallenge,
  async (req, res) => {
    try {
      const { team_id, team_member_id, user_id, challenge_id, competition_id, flag } = req.body;
      const isCompetitionSubmission = (
        (competition_id !== undefined && competition_id !== null)
        || (team_member_id !== undefined && team_member_id !== null)
      );

      if (isCompetitionSubmission && !req.competitionMemberId) {
        return res.status(401).json({ success: false, error: 'Competition token required' });
      }

      const effectiveTeamId = req.competitionMemberId ? req.competitionSessionTeamId : team_id;
      const effectiveTeamMemberId = req.competitionMemberId
        ? req.competitionMemberId
        : (team_member_id || user_id);
      const effectiveCompetitionId = req.competitionMemberId
        ? req.competitionSessionCompetitionId
        : (competition_id || null);

      if (!effectiveTeamId || !effectiveTeamMemberId || !challenge_id || !flag) {
        return res.status(400).json({
          success: false,
          error: 'team_id, team_member_id, challenge_id, and flag are required',
        });
      }

      const deviceInfo = DeviceTracker.extractDeviceInfo(req);
      const result = await SubmissionService.submitFlag({
        team_id: effectiveTeamId,
        team_member_id: effectiveTeamMemberId,
        challenge_id,
        competition_id: effectiveCompetitionId,
        flag,
        ip_address: deviceInfo.ipAddress,
        device_fingerprint: deviceInfo.deviceFingerprint,
      });

      if (result && typeof result === 'object' && req.submissionOrdering) {
        result.request_order = {
          key: req.submissionOrdering.key,
          sequence: req.submissionOrdering.sequence,
          received_at: req.submissionOrdering.receivedAt,
          processing_started_at: req.submissionOrdering.processingStartedAt,
          waited_for_lock: req.submissionOrdering.waitedForLock,
        };
      }

      if (!result.success && result.errorCode === 'competition_access_revoked') {
        return res.status(403).json(result);
      }

      return sendServiceResult(res, result);
    } catch (error) {
      return handleRouteError(res, error);
    }
  }
);

// Get competition leaderboard
router.get('/competitions/:competition_id/leaderboard', async (req, res) => {
  try {
    const result = await SubmissionService.getLeaderboard(
      toInt(req.params.competition_id)
    );
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
