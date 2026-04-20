import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import LiveMonitorService from './LiveMonitorService.js';
import { isAdmin } from '../routes/admin.js';
import { requireCompetitionMember } from '../middleware/competitionAuth.js';
import ScreenShareService from '../services/ScreenShareService.js';
import TeamService from '../services/TeamService.js';
import { handleRouteError } from '../utils/httpErrors.js';

const router = new express.Router();
const screenFrameUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1536 * 1024,
  },
});
const SCREEN_STREAM_TICKET_TTL_MS = 2 * 60 * 1000;
const screenStreamTickets = new Map();
const toIntOrNull = value => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : null;
};
const pruneExpiredScreenStreamTickets = () => {
  const currentTime = Date.now();

  for (const [token, ticket] of screenStreamTickets.entries()) {
    if (!ticket || ticket.expiresAt <= currentTime) {
      screenStreamTickets.delete(token);
    }
  }
};
const createScreenStreamTicket = ({ adminId, memberId }) => {
  pruneExpiredScreenStreamTickets();

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + SCREEN_STREAM_TICKET_TTL_MS;

  screenStreamTickets.set(token, {
    adminId,
    memberId,
    expiresAt,
  });

  return {
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};
const isValidScreenStreamTicket = (streamToken, memberId) => {
  pruneExpiredScreenStreamTickets();

  const normalizedMemberId = toIntOrNull(memberId);
  const ticket = screenStreamTickets.get(streamToken);

  if (!ticket || !normalizedMemberId) {
    return false;
  }

  return ticket.memberId === normalizedMemberId;
};
const authorizeScreenShareStream = (req, res, next) => {
  const streamToken = typeof req.query?.stream_token === 'string'
    ? req.query.stream_token.trim()
    : '';

  if (streamToken && isValidScreenStreamTicket(streamToken, req.params.memberId)) {
    return next();
  }

  return isAdmin(req, res, next);
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
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
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
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
      displaySurface: req.body.displaySurface,
      sourceLabel: req.body.sourceLabel,
    });
    await refreshParticipantPresence({
      memberId: req.competitionMemberId,
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.post(
  '/competition/live-monitor/screen-share/frame',
  requireCompetitionMember,
  screenFrameUpload.single('frame'),
  async (req, res) => {
  try {
    const snapshot = ScreenShareService.recordFrame({
      memberId: req.competitionMemberId,
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
      capturedAt: req.body.capturedAt,
      displaySurface: req.body.displaySurface,
      sourceLabel: req.body.sourceLabel,
      width: req.body.width,
      height: req.body.height,
      mimeType: req.file?.mimetype || req.body.mimeType,
      imageBuffer: req.file?.buffer || null,
      imageDataUrl: req.body.imageDataUrl,
    });
    await refreshParticipantPresence({
      memberId: req.competitionMemberId,
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
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

router.get('/admin/live-monitor/screen-share-stream/:memberId/ticket', isAdmin, (req, res) => {
  const memberId = toIntOrNull(req.params.memberId);

  if (!memberId) {
    return res.status(400).json({ success: false, error: 'Invalid memberId' });
  }

  const ticket = createScreenStreamTicket({
    adminId: req.adminId || null,
    memberId,
  });

  return res.json({
    success: true,
    data: {
      streamToken: ticket.token,
      expiresAt: ticket.expiresAt,
    },
  });
});

router.get('/admin/live-monitor/screen-share-stream/:memberId', authorizeScreenShareStream, (req, res) => {
  const streamResult = ScreenShareService.openStream(req.params.memberId, res);

  if (!streamResult.success) {
    return res.status(404).json({ success: false, error: streamResult.error });
  }

  const cleanup = () => {
    streamResult.cleanup?.();
  };

  req.on('close', cleanup);
  req.on('aborted', cleanup);

  return undefined;
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
    const snapshot = ScreenShareService.getSnapshot(req.params.memberId, {
      includeImageDataUrl: req.query.include_image !== '0',
    });

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
