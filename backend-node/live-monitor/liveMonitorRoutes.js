import express from 'express';
import LiveMonitorService from './LiveMonitorService.js';
import { isAdmin } from '../routes/admin.js';
import { requireCompetitionMember } from '../middleware/competitionAuth.js';
import ScreenShareService from '../services/ScreenShareService.js';
import TeamService from '../services/TeamService.js';
import { handleRouteError } from '../utils/httpErrors.js';

const router = new express.Router();
const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};
const refreshParticipantPresence = async ({
  memberId,
  teamId = null,
  competitionId = null,
  isTabActive,
}) => {
  try {
    await TeamService.touchMemberPresence(memberId);
  } catch (error) {
    console.warn('Unable to refresh team member presence from live monitor route:', error);
  }

  try {
    await LiveMonitorService.touchHeartbeat({
      memberId,
      teamId,
      competitionId,
      ...(isTabActive === undefined ? {} : { isTabActive }),
    });
  } catch (error) {
    console.warn('Unable to refresh live monitor heartbeat from live monitor route:', error);
  }
};

router.post('/competition/live-monitor/activity', requireCompetitionMember, async (req, res) => {
  try {
    try {
      await TeamService.touchMemberPresence(req.competitionMemberId);
    } catch (error) {
      console.warn('Unable to refresh team member presence from activity route:', error);
    }

    const result = await LiveMonitorService.recordClientActivity({
      memberId: req.competitionMemberId,
      teamId: req.body.teamId,
      competitionId: req.body.competitionId,
      currentChallengeId: req.body.currentChallengeId,
      eventChallengeId: req.body.eventChallengeId,
      clientEventType: req.body.clientEventType,
      eventOccurredAt: req.body.eventOccurredAt,
      isTabActive: req.body.isTabActive,
      lastTabBlur: req.body.lastTabBlur ? new Date(req.body.lastTabBlur) : null,
      currentChallengeViewedAt: req.body.currentChallengeViewedAt
        ? new Date(req.body.currentChallengeViewedAt)
        : null,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/live-monitor/participants', isAdmin, async (req, res) => {
  try {
    const result = await LiveMonitorService.getLiveParticipants({
      competitionId: toIntOrNull(req.query.competition_id),
    });

    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/competition/live-monitor/screen-share/start', requireCompetitionMember, async (req, res) => {
  try {
    const result = ScreenShareService.startSession({
      memberId: req.competitionMemberId,
      teamId: req.body.teamId,
      competitionId: req.body.competitionId,
      displaySurface: req.body.displaySurface,
      sourceLabel: req.body.sourceLabel,
    });
    await refreshParticipantPresence({
      memberId: req.competitionMemberId,
      teamId: req.body.teamId,
      competitionId: req.body.competitionId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/competition/live-monitor/screen-share/frame', requireCompetitionMember, async (req, res) => {
  try {
    const snapshot = ScreenShareService.recordFrame({
      memberId: req.competitionMemberId,
      teamId: req.body.teamId,
      competitionId: req.body.competitionId,
      capturedAt: req.body.capturedAt,
      displaySurface: req.body.displaySurface,
      sourceLabel: req.body.sourceLabel,
      width: req.body.width,
      height: req.body.height,
      mimeType: req.body.mimeType,
      imageDataUrl: req.body.imageDataUrl,
    });
    await refreshParticipantPresence({
      memberId: req.competitionMemberId,
      teamId: req.body.teamId,
      competitionId: req.body.competitionId,
    });

    return res.json({
      success: true,
      data: {
        lastFrameAt: snapshot?.lastFrameAt || null,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/competition/live-monitor/screen-share/stop', requireCompetitionMember, async (req, res) => {
  try {
    const result = ScreenShareService.stopSession(
      req.competitionMemberId,
      req.body.reason || 'participant-stopped'
    );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/admin/live-monitor/screen-share/:memberId', isAdmin, async (req, res) => {
  try {
    const snapshot = ScreenShareService.getSnapshot(req.params.memberId);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Participant is not sharing their screen' });
    }

    return res.json({ success: true, data: snapshot });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/live-monitor/screen-shares', isAdmin, async (req, res) => {
  try {
    const snapshots = ScreenShareService.getAllSnapshots({
      competitionId: toIntOrNull(req.query.competition_id),
    });

    return res.json({ success: true, data: snapshots });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/live-monitor/history/:memberId', isAdmin, async (req, res) => {
  try {
    const result = await LiveMonitorService.getParticipantActivityHistory(
      req.params.memberId,
      toIntOrNull(req.query.limit) || 100
    );

    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
