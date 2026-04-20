import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { JWT_SECRET } from '../config/security.js';
import DeviceTracker from '../services/DeviceTracker.js';
import TeamService from '../services/TeamService.js';
import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError,
} from '../utils/databaseErrors.js';

const COMPETITION_ACCESS_REVOKED_ERROR_CODE = 'competition_access_revoked';
const COMPETITION_SESSION_ENDED_MESSAGE = 'Your competition session is no longer active. Please log in again.';
const buildDatabaseUnavailableResult = () => ({
  success: false,
  status: 503,
  error: DATABASE_UNAVAILABLE_MESSAGE,
  accessRevoked: false,
});

const getCompetitionTokenFromRequest = req => {
  const headerToken = req.headers['x-competition-token'];

  if (headerToken) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
};

const sendCompetitionAccessRevoked = (res, status, error, extra = {}) => res.status(status).json({
  success: false,
  error,
  errorCode: COMPETITION_ACCESS_REVOKED_ERROR_CODE,
  ...extra,
});

const attachCompetitionMemberContext = (req, context) => {
  req.competitionMemberId = context.memberId;
  req.competitionUsername = context.username;
  req.competitionToken = context.token;
  req.competitionSessionId = context.sessionId;
  req.competitionSessionTeamId = context.teamId;
  req.competitionSessionCompetitionId = context.competitionId;
  req.competitionMemberStatus = context.status;
};

const resolveCompetitionMember = async req => {
  const competitionToken = getCompetitionTokenFromRequest(req);

  if (!competitionToken) {
    return {
      success: false,
      status: 401,
      error: 'Competition token required',
      accessRevoked: false,
    };
  }

  try {
    const decoded = jwt.verify(competitionToken, JWT_SECRET);
    const memberId = Number.parseInt(decoded.memberId, 10);

    if (!Number.isFinite(memberId) || memberId <= 0) {
      return {
        success: false,
        status: 401,
        error: 'Invalid competition token',
        accessRevoked: true,
      };
    }

    const memberResult = await TeamService.getMemberAccessState(memberId);

    if (!memberResult.success) {
      if (isDatabaseUnavailableError(memberResult)) {
        return buildDatabaseUnavailableResult();
      }

      return {
        success: false,
        status: 401,
        error: 'Competition member not found',
        accessRevoked: true,
      };
    }

    if (TeamService.isBlockedMemberStatus(memberResult.data.status)) {
      return {
        success: false,
        status: 403,
        error: TeamService.buildBlockedMemberMessage(memberResult.data.status),
        accessRevoked: true,
        memberStatus: memberResult.data.status,
      };
    }

    const activeSession = await DeviceTracker.getActiveSessionByToken(competitionToken, query);

    if (!activeSession || activeSession.team_member_id !== memberId) {
      return {
        success: false,
        status: 401,
        error: COMPETITION_SESSION_ENDED_MESSAGE,
        accessRevoked: true,
      };
    }

    return {
      success: true,
      context: {
        memberId,
        username: decoded.username || memberResult.data.username || null,
        token: competitionToken,
        sessionId: activeSession.id,
        teamId: memberResult.data.team_id || null,
        competitionId: memberResult.data.competition_id || activeSession.competition_id || null,
        status: memberResult.data.status || null,
      },
    };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return buildDatabaseUnavailableResult();
    }

    if (error.name === 'TokenExpiredError') {
      return {
        success: false,
        status: 401,
        error: 'Competition token expired. Please log in again.',
        accessRevoked: true,
      };
    }

    return {
      success: false,
      status: 401,
      error: 'Invalid competition token',
      accessRevoked: true,
    };
  }
};

const requireCompetitionMember = async (req, res, next) => {
  const result = await resolveCompetitionMember(req);

  if (!result.success) {
    if (result.accessRevoked) {
      return sendCompetitionAccessRevoked(
        res,
        result.status,
        result.error,
        result.memberStatus ? { memberStatus: result.memberStatus } : {}
      );
    }

    return res.status(result.status).json({ success: false, error: result.error });
  }

  attachCompetitionMemberContext(req, result.context);

  return next();
};

const attachCompetitionMemberIfPresent = async (req, res, next) => {
  if (!getCompetitionTokenFromRequest(req)) {
    return next();
  }

  const result = await resolveCompetitionMember(req);

  if (!result.success) {
    if (result.accessRevoked) {
      return sendCompetitionAccessRevoked(
        res,
        result.status,
        result.error,
        result.memberStatus ? { memberStatus: result.memberStatus } : {}
      );
    }

    return res.status(result.status).json({ success: false, error: result.error });
  }

  attachCompetitionMemberContext(req, result.context);

  return next();
};

export {
  attachCompetitionMemberIfPresent,
  getCompetitionTokenFromRequest,
  requireCompetitionMember,
};
