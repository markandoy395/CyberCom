import express from 'express';
import { isAdmin } from './admin.js';
import { requireCompetitionMember } from '../middleware/competitionAuth.js';
import TeamService from '../services/TeamService.js';
import LiveMonitorService from '../live-monitor/LiveMonitorService.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();

// Get all teams
router.get('/teams', isAdmin, async (req, res) => {
  try {
    const filters = {
      competition_id: req.query.competition_id ? parseInt(req.query.competition_id) : null,
    };

    const result = await TeamService.getTeams(filters);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get team by ID
router.get('/teams/:id', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.getTeamById(parseInt(req.params.id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get team members
router.get('/teams/:id/members', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.getTeamMembers(parseInt(req.params.id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Create team with members
router.post('/teams', isAdmin, async (req, res) => {
  try {
    const { teamName, members, competition_id } = req.body;

    // Check 2-team limit per competition
    if (competition_id) {
      const competitionTeamsResult = await TeamService.getTeams({ competition_id: parseInt(competition_id) });
      if (competitionTeamsResult.success && competitionTeamsResult.data) {
        const currentTeamCount = competitionTeamsResult.data.length || 0;
        if (currentTeamCount >= 2) {
          return res.status(400).json({
            success: false,
            error: 'This competition already has the maximum of 2 teams. Cannot create more teams for this competition.'
          });
        }
      }
    }

    const result = await TeamService.createTeamWithMembers({
      name: teamName,
      members,
      competition_id,
    });

    return sendServiceResult(res, result, {
      successStatus: 201,
      defaultErrorStatus: 400,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Update team
router.put('/teams/:id', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.updateTeam(parseInt(req.params.id), req.body);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Delete team
router.delete('/teams/:id', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.deleteTeam(parseInt(req.params.id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Link team to competition
router.post('/teams/:id/link-competition', isAdmin, async (req, res) => {
  try {
    const { competition_id } = req.body;
    if (!competition_id) {
      return res.status(400).json({ success: false, error: 'competition_id required' });
    }

    const result = await TeamService.linkToCompetition(parseInt(req.params.id), competition_id);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Update team member
router.put('/teams/:teamId/members/:memberId', isAdmin, async (req, res) => {
  try {
    const { username, email, role, is_online, status } = req.body;

    if (!username && !email && !role && is_online === undefined && !status) {
      return res.status(400).json({ success: false, error: 'At least one field to update is required' });
    }

    const updateData = {
      username,
      email,
      role
    };

    // If admin is updating status from admin panel
    if (is_online !== undefined || status) {
      updateData.is_online = is_online !== undefined ? (is_online ? 1 : 0) : undefined;
      updateData.status = status;
    }

    const result = await TeamService.updateTeamMember(parseInt(req.params.memberId), updateData);

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Reset team member password
router.post('/teams/:teamId/members/:memberId/reset-password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, error: 'New password is required' });
    }

    const result = await TeamService.resetMemberPassword(parseInt(req.params.memberId), newPassword);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Delete team member
router.delete('/teams/:teamId/members/:memberId', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.deleteTeamMember(parseInt(req.params.memberId));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Heartbeat - keep member status as 'online'
router.post('/teams/heartbeat', requireCompetitionMember, async (req, res) => {
  try {
    const { isTabActive } = req.body;
    const parsedMemberId = req.competitionMemberId;
    const result = await TeamService.touchMemberPresence(parsedMemberId);

    if (!result.success && result.blocked) {
      return res.status(403).json({
        success: false,
        error: result.error,
        errorCode: 'competition_access_revoked',
        memberStatus: result.status,
      });
    }

    await LiveMonitorService.touchHeartbeat({
      memberId: parsedMemberId,
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
      isTabActive,
    });

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Confirm member is online
router.post('/teams/member/confirm-online', requireCompetitionMember, async (req, res) => {
  try {
    const { isTabActive } = req.body;
    const parsedMemberId = req.competitionMemberId;
    const result = await TeamService.touchMemberPresence(parsedMemberId);

    if (!result.success && result.blocked) {
      return res.status(403).json({
        success: false,
        error: result.error,
        errorCode: 'competition_access_revoked',
        memberStatus: result.status,
      });
    }

    await LiveMonitorService.touchHeartbeat({
      memberId: parsedMemberId,
      teamId: req.competitionSessionTeamId,
      competitionId: req.competitionSessionCompetitionId,
      isTabActive,
    });

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Logout - set member status to 'offline'
router.post('/teams/logout', requireCompetitionMember, async (req, res) => {
  try {
    const parsedMemberId = req.competitionMemberId;
    const result = await TeamService.updateMemberLoginStatus(parsedMemberId, false);
    await LiveMonitorService.markMemberOffline(parsedMemberId);
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
