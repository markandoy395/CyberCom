import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import LiveMonitorService from '../live-monitor/LiveMonitorService.js';
import DeviceTracker from './DeviceTracker.js';
import ScreenShareService from './ScreenShareService.js';
import LiveMonitorActivityService from './LiveMonitorActivityService.js';

const TEAM_SELECT = `
  SELECT t.*, COUNT(tm.id) AS memberCount
  FROM teams t
  LEFT JOIN team_members tm ON t.id = tm.team_id
`;
const DISQUALIFIED_STATUS = 'disqualified';
const BLOCKED_MEMBER_STATUSES = new Set([DISQUALIFIED_STATUS]);
const BLOCKED_MEMBER_STATUS_SQL = [...BLOCKED_MEMBER_STATUSES]
  .map(status => `'${status}'`)
  .join(', ');
const ok = (extra = {}) => ({ success: true, ...extra });
const invalid = error => ({ success: false, error });
const fail = (error, duplicateMessage = null) => ({
  success: false,
  error: error.code === 'ER_DUP_ENTRY' && duplicateMessage ? duplicateMessage : error.message,
});
const text = value => String(value ?? '').trim();
const intOrNull = value => (
  value === undefined || value === null || value === '' ? null : parseInt(value, 10)
);
const PRESENCE_LAST_SEEN_SQL = 'COALESCE(last_seen_at, last_login)';
const getPresenceTimeoutMs = () => {
  const configured = parseInt(
    process.env.COMPETITION_PRESENCE_TIMEOUT_MS
    || process.env.MEMBER_HEARTBEAT_TIMEOUT_MS
    || '300000',
    10
  );

  return Number.isFinite(configured) && configured > 0 ? configured : 300000;
};
const getLastSeenAt = member => {
  if (!member) {
    return null;
  }

  return member.last_seen_at || member.last_login || null;
};
const isBlockedMemberStatus = status => (
  BLOCKED_MEMBER_STATUSES.has(String(status || '').trim().toLowerCase())
);
const buildBlockedMemberMessage = status => {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (normalizedStatus === DISQUALIFIED_STATUS) {
    return 'You were disqualified for violating the competition rules. You cannot log in again.';
  }

  return 'Your competition access has been revoked. You cannot log in again.';
};
const normalizeMemberPresence = member => {
  if (!member) {
    return member;
  }

  const rawLastSeen = getLastSeenAt(member);

  if (isBlockedMemberStatus(member.status)) {
    return {
      ...member,
      is_online: 0,
      status: String(member.status).trim().toLowerCase(),
      last_seen_at: rawLastSeen,
    };
  }

  const lastSeen = rawLastSeen ? new Date(rawLastSeen) : null;
  const isFresh = lastSeen && Date.now() - lastSeen.getTime() <= getPresenceTimeoutMs();

  return !member.is_online || !isFresh
    ? { ...member, is_online: 0, status: 'offline', last_seen_at: rawLastSeen }
    : {
      ...member,
      is_online: 1,
      status: 'online',
      last_seen_at: rawLastSeen,
    };
};
const touchMemberPresence = (memberId, queryFn = query, options = {}) => {
  const { recordLogin = false } = options;

  return queryFn(
    `UPDATE team_members
     SET is_online = 1,
         status = ?,
         last_seen_at = NOW()
         ${recordLogin ? ', last_login = NOW()' : ''}
     WHERE id = ?
       AND LOWER(COALESCE(status, '')) NOT IN (${BLOCKED_MEMBER_STATUS_SQL})`,
    ['online', memberId]
  );
};
const MEMBER_POINTS_SELECT = `
  COALESCE((
    SELECT SUM(member_scores.points)
    FROM (
      SELECT MAX(s.awarded_points) AS points
      FROM submissions s
      WHERE s.team_member_id = tm.id
        AND s.is_correct = 1
      GROUP BY COALESCE(s.competition_id, 0), s.challenge_id
    ) member_scores
  ), 0)
`;
const cleanupStalePresence = async (queryFn = query) => {
  try {
    const cutoff = new Date(Date.now() - getPresenceTimeoutMs());
    const staleMembers = await queryFn(
      `SELECT id
       FROM team_members
       WHERE is_online = 1
       AND (${PRESENCE_LAST_SEEN_SQL} IS NULL OR ${PRESENCE_LAST_SEEN_SQL} < ?)`,
      [cutoff]
    );

    if (!staleMembers.length) {
      return ok({ cleanedMembers: 0, cleanedSessions: 0 });
    }

    const ids = staleMembers.map(({ id }) => id);
    const placeholders = ids.map(() => '?').join(', ');
    const memberUpdate = await queryFn(
      `UPDATE team_members
       SET is_online = 0,
           status = CASE
             WHEN LOWER(COALESCE(status, '')) IN (${BLOCKED_MEMBER_STATUS_SQL}) THEN status
             ELSE ?
           END
       WHERE id IN (${placeholders})`,
      ['offline', ...ids]
    );
    const sessionUpdate = await queryFn(
      `UPDATE login_history SET logout_time = NOW(), is_active = 0
       WHERE team_member_id IN (${placeholders}) AND is_active = 1 AND logout_time IS NULL`,
      ids
    );
    await LiveMonitorService.markMembersOffline(ids, queryFn);

    return ok({
      cleanedMembers: memberUpdate.affectedRows || 0,
      cleanedSessions: sessionUpdate.affectedRows || 0,
    });
  } catch (error) { return fail(error); }
};
const getSingleTeam = async (field, value) => {
  const [team] = await query(`${TEAM_SELECT} WHERE ${field} = ? GROUP BY t.id`, [value]);

  return team || null;
};

export class TeamService {
  static isBlockedMemberStatus(status) { return isBlockedMemberStatus(status); }
  static buildBlockedMemberMessage(status) { return buildBlockedMemberMessage(status); }
  static normalizeMemberPresence(member) { return normalizeMemberPresence(member); }
  static cleanupStalePresence(queryFn = query) { return cleanupStalePresence(queryFn); }
  static async getMemberAccessState(memberId, queryFn = query) {
    try {
      const [data] = await queryFn(
        `SELECT tm.id, tm.username, tm.team_id, tm.status, tm.is_online,
                t.competition_id, t.name AS team_name
         FROM team_members tm
         LEFT JOIN teams t ON tm.team_id = t.id
         WHERE tm.id = ?
         LIMIT 1`,
        [memberId]
      );

      return data ? ok({ data }) : invalid('Member not found');
    } catch (error) { return fail(error); }
  }

  static async touchMemberPresence(memberId, queryFn = query, options = {}) {
    const result = await touchMemberPresence(memberId, queryFn, options);

    if (!result.affectedRows) {
      const memberResult = await this.getMemberAccessState(memberId, queryFn);

      if (!memberResult.success) {
        return memberResult;
      }

      if (isBlockedMemberStatus(memberResult.data.status)) {
        return {
          success: false,
          blocked: true,
          status: memberResult.data.status,
          error: buildBlockedMemberMessage(memberResult.data.status),
        };
      }
    }

    return ok({ updated: result.affectedRows });
  }

  static async getTeams(filters = {}) {
    try {
      const params = filters.competition_id ? [filters.competition_id] : [];
      const where = filters.competition_id ? ' WHERE t.competition_id = ?' : '';
      const data = await query(`${TEAM_SELECT}${where} GROUP BY t.id ORDER BY t.created_at DESC`, params);

      return ok({ data });
    } catch (error) { return fail(error); }
  }

  static async getTeamById(id) {
    try {
      const data = await getSingleTeam('t.id', id);

      return data ? ok({ data }) : invalid('Team not found');
    } catch (error) { return fail(error); }
  }

  static async getTeamByNameAndPassword(name, password) {
    try {
      const data = await getSingleTeam('t.name', name);

      return !data
        ? invalid('Team not found')
        : password
          ? invalid('Team password is not used. Use individual member credentials.')
          : ok({ data });
    } catch (error) { return fail(error); }
  }

  static async getTeamMembers(teamId) {
    try {
      await cleanupStalePresence();
      const data = await query(
        `SELECT tm.id, tm.username, tm.email, tm.role,
                ${MEMBER_POINTS_SELECT} AS points,
                tm.joined_at, tm.is_online, tm.status,
                last_login, last_seen_at
         FROM team_members tm
         WHERE tm.team_id = ?`,
        [teamId]
      );

      return ok({ data: data.map(normalizeMemberPresence) });
    } catch (error) { return fail(error); }
  }

  static async createTeam(data) {
    try {
      if (!data) {
        return invalid('Team data is required');
      }

      const name = text(data.name);
      const max_members = typeof data.max_members === 'number' ? data.max_members : 4;
      const competition_id = intOrNull(data.competition_id);

      if (!name) {
        return invalid('Team name is required');
      }

      const result = await query(
        'INSERT INTO teams (name, max_members, competition_id) VALUES (?, ?, ?)',
        [name, max_members, competition_id]
      );

      return ok({ team: { id: result.insertId, name, max_members, competition_id } });
    } catch (error) { return fail(error, 'Team name already exists'); }
  }

  static async createTeamMember(data) {
    try {
      if (!data) {
        return invalid('Member data is required');
      }

      const username = text(data.username);
      const name = text(data.name);
      const email = text(data.email);
      const password = String(data.password || '');
      const team_id = data.team_id ?? null;
      const role = text(data.role || 'member');

      if (!username || !name || !email || !password) {
        return invalid('Username, name, email, and password are required');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        'INSERT INTO team_members (username, name, email, password, team_id, role) VALUES (?, ?, ?, ?, ?, ?)',
        [username, name, email, hashedPassword, team_id, role]
      );

      return ok({ member: { id: result.insertId, username, name, email, team_id, role } });
    } catch (error) { return fail(error, 'Username or email already exists'); }
  }

  static async updateTeam(id, data) {
    try {
      const entries = Object.entries(data || {});

      if (!entries.length) {
        return ok({ updated: 0 });
      }

      const fields = entries.map(([key]) => `${key} = ?`).join(', ');
      const values = entries.map(([, value]) => (value === undefined ? null : value));
      const result = await query(`UPDATE teams SET ${fields} WHERE id = ?`, [...values, id]);

      return ok({ updated: result.affectedRows });
    } catch (error) { return fail(error); }
  }

  static async deleteTeam(id) {
    try {
      const result = await query('DELETE FROM teams WHERE id = ?', [id]);

      return ok({ deleted: result.affectedRows });
    } catch (error) { return fail(error); }
  }

  static async linkToCompetition(teamId, competitionId) {
    try {
      const result = await query(
        'UPDATE teams SET competition_id = ?, status = ? WHERE id = ?',
        [competitionId, 'registered', teamId]
      );

      return ok({ updated: result.affectedRows });
    } catch (error) { return fail(error); }
  }

  static async updateMemberLoginStatus(memberId, online = true) {
    try {
      const result = online
        ? await touchMemberPresence(memberId, query, { recordLogin: true })
        : await query(
          `UPDATE team_members
           SET is_online = ?,
               status = CASE
                 WHEN LOWER(COALESCE(status, '')) IN (${BLOCKED_MEMBER_STATUS_SQL}) THEN status
                 ELSE ?
               END
           WHERE id = ?`,
          [0, 'offline', memberId]
        );

      return ok({ updated: result.affectedRows });
    } catch (error) { return fail(error); }
  }

  static async getMemberByPin(accessPin) {
    try {
      const [data] = await query(
        `SELECT tm.*, t.name AS team_name, t.competition_id
         FROM team_members tm LEFT JOIN teams t ON tm.team_id = t.id
         WHERE tm.access_pin = ?`,
        [accessPin]
      );

      return data ? ok({ data }) : invalid('Invalid access PIN');
    } catch (error) { return fail(error); }
  }

  static async validateMemberPin(accessPin, password) {
    try {
      const memberResult = await this.getMemberByPin(accessPin);

      if (!memberResult.success) {
        return memberResult;
      }

      const isValidPassword = await bcrypt.compare(password, memberResult.data.password);

      return isValidPassword ? ok({ data: memberResult.data }) : invalid('Invalid password');
    } catch (error) { return fail(error); }
  }

  static async updateTeamMember(memberId, data) {
    try {
      if (!data || !Object.keys(data).length) {
        return invalid('No data provided to update');
      }

      const entries = ['username', 'email', 'role', 'is_online', 'status']
        .filter(field => data[field] !== undefined)
        .map(field => [field, ['status', 'is_online'].includes(field) ? data[field] : text(data[field])]);

      if (!entries.length) {
        return invalid('No valid fields to update');
      }

      const fields = entries.map(([field]) => `${field} = ?`).join(', ');
      const values = entries.map(([, value]) => value);
      const result = await query(`UPDATE team_members SET ${fields} WHERE id = ?`, [...values, memberId]);

      return result.affectedRows ? ok({ updated: result.affectedRows }) : invalid('Member not found');
    } catch (error) { return fail(error, 'Username or email already exists'); }
  }

  static async resetMemberPassword(memberId, newPassword) {
    try {
      const password = text(newPassword);

      if (!password) {
        return invalid('New password is required');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query('UPDATE team_members SET password = ? WHERE id = ?', [hashedPassword, memberId]);

      return result.affectedRows ? ok({ updated: result.affectedRows }) : invalid('Member not found');
    } catch (error) { return fail(error); }
  }

  static async deleteTeamMember(memberId) {
    try {
      const result = await query('DELETE FROM team_members WHERE id = ?', [memberId]);

      return result.affectedRows ? ok({ deleted: result.affectedRows }) : invalid('Member not found');
    } catch (error) { return fail(error); }
  }

  static async disqualifyTeamMember(memberId, options = {}) {
    try {
      const reason = text(options.reason || 'Rule violation');
      const memberResult = await this.getMemberAccessState(memberId);

      if (!memberResult.success) {
        return memberResult;
      }

      const member = memberResult.data;
      const activeSessions = await DeviceTracker.getActiveSessions(memberId, query);

      await query(
        'UPDATE team_members SET is_online = 0, status = ? WHERE id = ?',
        [DISQUALIFIED_STATUS, memberId]
      );

      for (const session of activeSessions) {
        await DeviceTracker.terminateSession(session.id, query);
      }

      await LiveMonitorService.markMemberOffline(memberId, query);
      ScreenShareService.stopSession(memberId, 'rule-violation-disqualification');
      LiveMonitorActivityService.recordEvent({
        type: 'rule_violation',
        title: 'Removed for rule violation',
        severity: 'warning',
        memberId,
        teamId: member.team_id,
        competitionId: member.competition_id,
        description: reason,
        metadata: {
          action: 'disqualify',
          status: DISQUALIFIED_STATUS,
          terminatedSessions: activeSessions.length,
        },
      });

      return ok({
        memberId,
        username: member.username,
        status: DISQUALIFIED_STATUS,
        terminatedSessions: activeSessions.length,
        reason,
      });
    } catch (error) { return fail(error); }
  }
}

export default TeamService;
