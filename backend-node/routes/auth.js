import express from 'express';
import jwt from 'jsonwebtoken';
import { isAdmin } from './admin.js';
import AuthService from '../services/AuthService.js';
import CompetitionStatusService from '../services/CompetitionStatusService.js';
import CompetitionStartValidationService from '../services/CompetitionStartValidationService.js';
import DeviceTracker from '../services/DeviceTracker.js';
import TeamService from '../services/TeamService.js';
import { getConnection, query } from '../config/database.js';
import { JWT_SECRET } from '../config/security.js';
import LiveMonitorService from '../live-monitor/LiveMonitorService.js';
import ScreenShareService from '../services/ScreenShareService.js';
import LiveMonitorActivityService from '../services/LiveMonitorActivityService.js';
import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError,
} from '../utils/databaseErrors.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();
const LOGIN_MESSAGE = 'Login successful';
const ONLINE_STATUS = 'online';
const DEVICE_BUSY_MESSAGE = 'Please wait for the other user to logout or go offline';
const DEVICE_OWNER_MESSAGE = 'This device can only be used by one participant account in this competition';
const TEAM_BUSY_MESSAGE = 'This team already has an active session on another device';
const TEAM_MEMBER_USER_TYPE = 'team_member';

const respondError = (res, status, error, extra = {}) => res.status(status).json({
  success: false,
  error,
  ...extra,
});
const getTeamCompetition = async teamId => {
  const results = await query(
    `SELECT t.id, t.name, t.competition_id, t.status,
            c.status AS competition_status,
            c.end_date AS competition_end_date
     FROM teams t
     LEFT JOIN competitions c ON t.competition_id = c.id
     WHERE t.id = ?`,
    [teamId]
  );
  const [team] = results;

  if (!team) {
    return null;
  }

  const effectiveCompetitionStatus = CompetitionStatusService.getEffectiveStatus(
    team.competition_status,
    team.competition_end_date
  );

  if (team.competition_id && effectiveCompetitionStatus !== team.competition_status) {
    await CompetitionStatusService.finalizeExpiredCompetition(team.competition_id, query);
  }

  return {
    ...team,
    competition_status: effectiveCompetitionStatus,
  };
};
const buildCompetitionReadinessError = failedItems => ({
  status: 403,
  error: `This competition is not ready for participant login yet. Complete all required pre-competition validation items first. Missing: ${failedItems.join(', ')}`,
  details: {
    failedItems,
  },
});
const getTeamMemberLoginEligibility = async (
  team,
  { requireAssignedCompetition = false, hasTeamAssociation = false } = {}
) => {
  if (!team) {
    if (requireAssignedCompetition || hasTeamAssociation) {
      return {
        success: false,
        status: 401,
        error: 'Team not found',
      };
    }

    return { success: true };
  }

  if (!team.competition_id) {
    if (requireAssignedCompetition) {
      return {
        success: false,
        status: 401,
        error: 'Team is not assigned to an active competition',
      };
    }

    return { success: true };
  }

  if (team.status !== 'registered' && team.status !== 'active') {
    return {
      success: false,
      status: 401,
      error: 'Team is not active for this competition',
    };
  }

  if (team.competition_status === 'upcoming') {
    return {
      success: false,
      status: 403,
      error: 'This competition has not started yet. Please wait for the admin to start it.',
    };
  }

  if (team.competition_status === 'done' || team.competition_status === 'cancelled') {
    return {
      success: false,
      status: 401,
      error: team.competition_status === 'cancelled'
        ? 'This competition has been cancelled. You cannot login.'
        : 'This competition has ended. You cannot login.',
    };
  }

  const readinessResult = await CompetitionStartValidationService.getValidation(
    team.competition_id
  );

  if (!readinessResult.success) {
    return {
      success: false,
      status: readinessResult.error === 'Competition not found'
        ? 404
        : (isDatabaseUnavailableError(readinessResult.error) ? 503 : 500),
      error: isDatabaseUnavailableError(readinessResult.error)
        ? DATABASE_UNAVAILABLE_MESSAGE
        : readinessResult.error,
    };
  }

  if (!readinessResult.validation.startReady) {
    const blockingItems = readinessResult.validation.requiredFailedItems?.length
      ? readinessResult.validation.requiredFailedItems
      : readinessResult.validation.failedItems;

    return {
      success: false,
      ...buildCompetitionReadinessError(
        blockingItems.map(item => item.label)
      ),
    };
  }

  return {
    success: true,
  };
};
const markMemberOnline = (memberId, queryFn = query) => TeamService.touchMemberPresence(
  memberId,
  queryFn,
  { recordLogin: true }
);
const buildCompetitionDeviceInfo = (req, clientDeviceInfo = {}) => DeviceTracker.buildLoginDeviceInfo(
  req,
  clientDeviceInfo
);
const logCompetitionAttempt = attemptData => DeviceTracker.logAttempt({
  userType: TEAM_MEMBER_USER_TYPE,
  queryFn: attemptData.queryFn || query,
  ...attemptData,
});
const rejectCompetitionLogin = async (res, status, error, attemptData, extra = {}) => {
  await logCompetitionAttempt({
    loginStatus: 'failed',
    failureReason: error,
    ...attemptData,
  });

  return respondError(res, status, error, extra);
};
const createConnectionQuery = connection => async (sql, params = []) => {
  const [result] = await connection.execute(sql, params);

  return result;
};
const withCompetitionLoginLock = async (competitionId, teamId, deviceInfo, handler) => {
  const connection = await getConnection();
  const lockNames = [
    DeviceTracker.getCompetitionLockName(competitionId, deviceInfo),
    DeviceTracker.getCompetitionTeamLockName(competitionId, teamId),
  ]
    .filter(Boolean)
    .filter((lockName, index, names) => names.indexOf(lockName) === index)
    .sort();
  const queryFn = createConnectionQuery(connection);

  try {
    for (const lockName of lockNames) {
      const [lockRows] = await connection.query(
        'SELECT GET_LOCK(?, 5) AS is_locked',
        [lockName]
      );
      const [lockResult] = lockRows;

      if (!lockResult?.is_locked) {
        throw new Error('Unable to acquire login lock for this request');
      }
    }

    await connection.beginTransaction();
    const result = await handler(queryFn);
    await connection.commit();

    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors and keep the original failure.
    }

    throw error;
  } finally {
    try {
      for (const lockName of [...lockNames].reverse()) {
        await connection.query('DO RELEASE_LOCK(?)', [lockName]);
      }
    } catch {
      // Ignore lock release errors while closing the connection.
    }

    connection.release();
  }
};

router.post('/login/admin', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return respondError(res, 400, 'Username and password required');
    }

    return sendServiceResult(res, await AuthService.loginAdmin(username, password));
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/login/team', async (req, res) => {
  try {
    const { username, password } = req.body;

    await TeamService.cleanupStalePresence(query);

    if (!username || !password) {
      return respondError(res, 400, 'Username and password required');
    }

    const userRecord = await AuthService.getTeamMemberAuthRecord(username);
    const team = userRecord?.team_id ? await getTeamCompetition(userRecord.team_id) : null;
    const memberResult = await AuthService.loginTeamMember(username, password, {
      markOnline: false,
      userRecord,
    });

    if (!memberResult.success) {
      if (memberResult.blocked) {
        return respondError(res, 403, memberResult.error, {
          errorCode: 'competition_access_revoked',
          memberStatus: memberResult.status,
        });
      }

      return sendServiceResult(res, memberResult);
    }

    const eligibility = await getTeamMemberLoginEligibility(team, {
      hasTeamAssociation: Boolean(userRecord?.team_id),
    });

    if (!eligibility.success) {
      return respondError(
        res,
        eligibility.status,
        eligibility.error,
        eligibility.details ? { details: eligibility.details } : {}
      );
    }

    await TeamService.updateMemberLoginStatus(memberResult.user.id, true);

    return sendServiceResult(res, memberResult);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/login/user', async (req, res) => {
  try {
    const { identity, email, username, password } = req.body;
    const loginIdentity = identity || email || username;

    if (!loginIdentity || !password) {
      return respondError(res, 400, 'Email or username and password required');
    }

    return sendServiceResult(
      res,
      await AuthService.loginPracticeUser(loginIdentity, password)
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/login/practice', async (req, res) => {
  try {
    const { identity, email, username, password } = req.body;
    const loginIdentity = identity || email || username;

    if (!loginIdentity || !password) {
      return respondError(res, 400, 'Email or username and password required');
    }

    return sendServiceResult(
      res,
      await AuthService.loginPracticeUser(loginIdentity, password)
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/register/user', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return respondError(res, 400, 'Username, email, and password are required');
    }

    return sendServiceResult(
      res,
      await AuthService.registerPracticeUser(username, email, password)
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/register/practice', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return respondError(res, 400, 'Username, email, and password are required');
    }

    return sendServiceResult(
      res,
      await AuthService.registerPracticeUser(username, email, password)
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/register/team', isAdmin, async (req, res) => {
  try {
    const { username, email, password, team_id = null, role = 'member' } = req.body;

    if (!username || !email || !password) {
      return respondError(res, 400, 'Username, email, and password are required');
    }

    return sendServiceResult(
      res,
      await AuthService.registerTeamMember(username, email, password, team_id, role)
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/login/competition', async (req, res) => {
  try {
    const { username, password, deviceInfo: clientDeviceInfo = {} } = req.body;
    const deviceInfo = buildCompetitionDeviceInfo(req, clientDeviceInfo);

    await TeamService.cleanupStalePresence(query);

    if (!username || !password) {
      return rejectCompetitionLogin(
        res,
        400,
        'Username and password required',
        { username: username || null, deviceInfo }
      );
    }

    const userRecord = await AuthService.getTeamMemberAuthRecord(username);
    const team = userRecord?.team_id ? await getTeamCompetition(userRecord.team_id) : null;
    const competitionId = team?.competition_id || null;
    const memberResult = await AuthService.loginTeamMember(username, password, {
      markOnline: false,
      userRecord,
    });

    if (!memberResult.success) {
      if (memberResult.blocked) {
        return rejectCompetitionLogin(
          res,
          403,
          memberResult.error,
          {
            userId: userRecord?.id || null,
            username,
            competitionId,
            deviceInfo,
          },
          {
            errorCode: 'competition_access_revoked',
            memberStatus: memberResult.status,
          }
        );
      }

      if (isDatabaseUnavailableError(memberResult.error)) {
        return respondError(res, 503, DATABASE_UNAVAILABLE_MESSAGE);
      }

      return rejectCompetitionLogin(
        res,
        401,
        memberResult.error,
        {
          userId: userRecord?.id || null,
          username,
          competitionId,
          deviceInfo,
        }
      );
    }

    const member = memberResult.user;

    const eligibility = await getTeamMemberLoginEligibility(team, {
      requireAssignedCompetition: true,
      hasTeamAssociation: Boolean(userRecord?.team_id),
    });

    if (!eligibility.success) {
      return rejectCompetitionLogin(
        res,
        eligibility.status,
        eligibility.error,
        {
          userId: member.id,
          username: member.username,
          competitionId,
          deviceInfo,
        },
        eligibility.details ? { details: eligibility.details } : {}
      );
    }

    const loginResult = await withCompetitionLoginLock(
      team.competition_id,
      member.team_id,
      deviceInfo,
      async queryFn => {
        const deviceOwner = await DeviceTracker.getCompetitionDeviceOwner(
          team.competition_id,
          deviceInfo,
          queryFn
        );

        if (deviceOwner && deviceOwner.team_member_id !== member.id) {
          const failureReason = `This device is already assigned to ${deviceOwner.username} for this competition`;

          await logCompetitionAttempt({
            userId: member.id,
            username: member.username,
            competitionId,
            deviceInfo,
            loginStatus: 'blocked',
            failureReason,
            queryFn,
          });

          return {
            success: false,
            status: 403,
            error: failureReason,
            details: {
              deviceName: deviceInfo.deviceName,
              assignedUser: deviceOwner.username,
              busyUser: deviceOwner.username,
              message: DEVICE_OWNER_MESSAGE,
            },
          };
        }

        const otherUsersOnDevice = await DeviceTracker.findActiveSessionsOnSameDevice(
          deviceInfo,
          {
            excludeUserId: member.id,
            competitionId: team.competition_id,
            userType: TEAM_MEMBER_USER_TYPE,
          },
          queryFn
        );

        if (otherUsersOnDevice.length > 0) {
          const [otherUser] = otherUsersOnDevice;
          const failureReason = `This device is already in use by ${otherUser.username}`;

          await logCompetitionAttempt({
            userId: member.id,
            username: member.username,
            competitionId,
            deviceInfo,
            loginStatus: 'blocked',
            failureReason,
            queryFn,
          });

          return {
            success: false,
            status: 403,
            error: failureReason,
            details: {
              deviceName: deviceInfo.deviceName,
              busyUser: otherUser.username,
              message: DEVICE_BUSY_MESSAGE,
            },
          };
        }

        const activeTeamSessions = await DeviceTracker.findActiveSessionsForTeam(
          member.team_id,
          { competitionId: team.competition_id },
          queryFn
        );
        const otherTeamSessions = activeTeamSessions.filter(session => (
          session.team_member_id !== member.id
          || !DeviceTracker.isSameDevice(deviceInfo, DeviceTracker.getSessionDeviceInfo(session))
        ));

        if (otherTeamSessions.length > 0) {
          const [activeSession] = otherTeamSessions;
          const failureReason = `Team ${team.name} already has an active session on another device`;

          await logCompetitionAttempt({
            userId: member.id,
            username: member.username,
            competitionId,
            deviceInfo,
            loginStatus: 'blocked',
            failureReason,
            queryFn,
          });

          return {
            success: false,
            status: 403,
            error: failureReason,
            details: {
              deviceName: activeSession.device_name || deviceInfo.deviceName,
              busyUser: activeSession.username,
              message: TEAM_BUSY_MESSAGE,
            },
          };
        }

        await markMemberOnline(member.id, queryFn);
        await LiveMonitorService.registerCompetitionLogin(
          {
            teamMemberId: member.id,
            teamId: member.team_id,
            competitionId: team.competition_id,
          },
          queryFn
        );

        const sessionToken = jwt.sign(
          { memberId: member.id, username: member.username },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        await DeviceTracker.logLogin(
          member.id,
          member.username,
          TEAM_MEMBER_USER_TYPE,
          deviceInfo,
          {
            sessionToken,
            competitionId: team.competition_id,
            queryFn,
          }
        );
        LiveMonitorActivityService.recordEvent({
          type: 'login',
          memberId: member.id,
          teamId: member.team_id,
          competitionId: team.competition_id,
          description: `${member.username} joined ${team.name}`,
        });

        return {
          success: true,
          sessionToken,
        };
      }
    );

    if (!loginResult.success) {
      return respondError(
        res,
        loginResult.status,
        loginResult.error,
        { details: loginResult.details }
      );
    }

    return res.json({
      success: true,
      data: {
        memberId: member.id,
        username: member.username,
        email: member.email,
        role: member.role,
        teamId: member.team_id,
        teamName: team.name,
        competitionId: team.competition_id,
        status: ONLINE_STATUS,
        teamStatus: team.status,
        competitionStatus: team.competition_status,
        sessionToken: loginResult.sessionToken,
        deviceName: deviceInfo.deviceName,
        otherDevicesLoggedOut: 0,
      },
      message: LOGIN_MESSAGE,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/logout/competition', async (req, res) => {
  try {
    const { memberId, sessionToken } = req.body;

    if (!sessionToken) {
      return respondError(res, 400, 'sessionToken required');
    }

    const activeSession = await DeviceTracker.getActiveSessionByToken(sessionToken, query);
    const resolvedMemberId = Number.parseInt(
      memberId || activeSession?.team_member_id,
      10
    );

    if (Number.isFinite(resolvedMemberId) && resolvedMemberId > 0) {
      await TeamService.updateMemberLoginStatus(resolvedMemberId, false);
      await LiveMonitorService.markMemberOffline(resolvedMemberId);
      ScreenShareService.stopSession(resolvedMemberId, 'logout');
      LiveMonitorActivityService.recordEvent({
        type: 'logout',
        memberId: resolvedMemberId,
        description: 'Participant left the competition session',
      });
    }

    await DeviceTracker.logLogout(sessionToken, query);

    return res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
