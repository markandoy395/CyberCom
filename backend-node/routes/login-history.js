import express from 'express';
import DeviceTracker from '../services/DeviceTracker.js';
import { query } from '../config/database.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();

/**
 * GET /api/admin/login-history
 * Get all login history (admin only)
 */
router.get('/login-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const results = await query(
      `SELECT 
        id, admin_id, team_member_id, username, user_type, competition_id, device_fingerprint, device_name,
        ip_address, user_agent, browser, os, mac_address, login_status,
        failure_reason, login_time, logout_time, is_active 
       FROM login_history 
       ORDER BY login_time DESC 
       LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * GET /api/admin/login-history/:memberId
 * Get login history for a specific member
 */
router.get('/login-history/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const history = await DeviceTracker.getUserLoginHistory(
      parseInt(memberId, 10),
      limit,
      query
    );

    res.json({ success: true, data: history, memberId });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * GET /api/admin/active-sessions/:memberId
 * Get currently active sessions for a member
 */
router.get('/active-sessions/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;

    const sessions = await DeviceTracker.getActiveSessions(
      parseInt(memberId, 10),
      query
    );

    res.json({ success: true, data: sessions, memberId });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * POST /api/admin/terminate-session/:sessionId
 * Force logout a user from a specific device/session
 */
router.post('/terminate-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await DeviceTracker.terminateSession(
      parseInt(sessionId, 10),
      query
    );

    if (result.success) {
      return res.json({ success: true, message: 'Session terminated successfully' });
    } else {
      return sendServiceResult(res, result, { defaultErrorStatus: 500 });
    }
  } catch (error) {
    return handleRouteError(res, error);
  }
});

/**
 * POST /api/admin/check-multiple-logins/:memberId
 * Check if a member has active sessions on multiple devices
 */
router.post('/check-multiple-logins/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { currentDeviceFingerprint, currentDeviceInfo, competitionId } = req.body;
    const parsedCompetitionId = Number.parseInt(competitionId, 10);

    if (!currentDeviceFingerprint && !currentDeviceInfo) {
      return res.status(400).json({
        success: false,
        error: 'currentDeviceFingerprint or currentDeviceInfo is required',
      });
    }

    const deviceInfo = currentDeviceInfo || {
      deviceFingerprint: currentDeviceFingerprint,
    };

    const multipleLogins = await DeviceTracker.checkMultipleDeviceLogins(
      parseInt(memberId, 10),
      deviceInfo,
      query,
      {
        competitionId: Number.isNaN(parsedCompetitionId) ? null : parsedCompetitionId,
      }
    );

    res.json({
      success: true,
      hasMultipleLogins: multipleLogins.length > 0,
      count: multipleLogins.length,
      data: multipleLogins,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
