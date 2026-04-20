import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { JWT_SECRET } from '../config/security.js';
import { getDatabaseClientErrorMessage } from '../utils/databaseErrors.js';
import TeamService from './TeamService.js';

const TOKEN_EXPIRY = '24h';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const invalid = error => ({ success: false, error });
const buildMemberToken = userId => Buffer.from(`${userId}:${Date.now()}`).toString('base64');
const logError = (scope, error) => process.stderr.write(`[AuthService] ${scope}: ${error.message}\n`);

export class AuthService {
  static async getPracticeUserByIdentity(identity) {
    const normalizedIdentity = String(identity || '').trim();

    if (!normalizedIdentity) {
      return null;
    }

    const results = await query(
      `SELECT id, username, email, status, password_hash, created_at
       FROM practice_users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [normalizedIdentity, normalizedIdentity]
    );

    return results[0] || null;
  }

  static async getTeamMemberAuthRecord(username) {
    const results = await query(
      'SELECT id, username, email, team_id, role, password, status FROM team_members WHERE username = ?',
      [username]
    );

    return results[0] || null;
  }

  static async loginAdmin(username, password) {
    try {
      const results = await query(
        'SELECT id, username, email, role, is_active, password_hash FROM admin WHERE username = ? AND is_active = 1',
        [username]
      );
      const [admin] = results;

      if (!admin) {
        return invalid('Invalid credentials');
      }

      const isValidPassword = await bcrypt.compare(password, admin.password_hash);
      if (!isValidPassword) {
        return invalid('Invalid credentials');
      }

      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          type: 'admin',
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        success: true,
        token,
        expiresIn: TOKEN_EXPIRY,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      };
    } catch (error) {
      logError('loginAdmin error', error);
      const databaseMessage = getDatabaseClientErrorMessage(error);

      return invalid(databaseMessage || 'Authentication failed');
    }
  }

  static async loginTeamMember(username, password, options = {}) {
    try {
      const { markOnline = false, userRecord = null } = options;
      const user = userRecord || await this.getTeamMemberAuthRecord(username);

      if (!user) {
        return invalid(INVALID_CREDENTIALS_MESSAGE);
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return invalid(INVALID_CREDENTIALS_MESSAGE);
      }

      if (TeamService.isBlockedMemberStatus(user.status)) {
        return {
          success: false,
          blocked: true,
          status: user.status,
          error: TeamService.buildBlockedMemberMessage(user.status),
        };
      }

      if (markOnline) {
        await TeamService.updateMemberLoginStatus(user.id, true);
      }

      return {
        success: true,
        token: buildMemberToken(user.id),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          team_id: user.team_id,
          role: user.role,
        },
      };
    } catch (error) {
      logError('loginTeamMember error', error);

      return invalid(error.message);
    }
  }

  static async loginPracticeUser(identity, password) {
    try {
      const user = await this.getPracticeUserByIdentity(identity);

      if (!user) {
        return invalid(INVALID_CREDENTIALS_MESSAGE);
      }

      if (!user.password_hash) {
        return invalid(INVALID_CREDENTIALS_MESSAGE);
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return invalid(INVALID_CREDENTIALS_MESSAGE);
      }

      if (user.status && user.status !== 'active') {
        return invalid('This practice account is not active');
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: 'practice_user',
          type: 'practice_user',
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        success: true,
        token,
        expiresIn: TOKEN_EXPIRY,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: 'practice_user',
          created_at: user.created_at,
        },
      };
    } catch (error) {
      logError('loginPracticeUser error', error);
      const databaseMessage = getDatabaseClientErrorMessage(error);

      return invalid(databaseMessage || 'Practice login failed');
    }
  }

  static async registerPracticeUser(username, email, password) {
    try {
      const normalizedUsername = String(username || '').trim();
      const normalizedEmail = String(email || '').trim().toLowerCase();

      if (!normalizedUsername || !normalizedEmail || !password) {
        return invalid('Username, email, and password are required');
      }

      const existingUsers = await query(
        'SELECT id FROM practice_users WHERE username = ? OR email = ? LIMIT 1',
        [normalizedUsername, normalizedEmail]
      );

      if (existingUsers.length > 0) {
        return invalid('Username or email already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await query(
        `INSERT INTO practice_users (username, email, password_hash, status)
         VALUES (?, ?, ?, 'active')`,
        [normalizedUsername, normalizedEmail, passwordHash]
      );

      const token = jwt.sign(
        {
          id: result.insertId,
          username: normalizedUsername,
          email: normalizedEmail,
          role: 'practice_user',
          type: 'practice_user',
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
      );

      return {
        success: true,
        token,
        expiresIn: TOKEN_EXPIRY,
        user: {
          id: result.insertId,
          username: normalizedUsername,
          email: normalizedEmail,
          role: 'practice_user',
        },
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return invalid('Username or email already exists');
      }

      logError('registerPracticeUser error', error);
      const databaseMessage = getDatabaseClientErrorMessage(error);

      return invalid(databaseMessage || 'Practice registration failed');
    }
  }

  static async registerTeamMember(username, email, password, teamId, role = 'member') {
    try {
      const team_id = teamId || null;
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        'INSERT INTO team_members (username, email, password, team_id, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, team_id, role]
      );

      return {
        success: true,
        user: {
          id: result.insertId,
          username,
          email,
          team_id,
          role,
        },
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return invalid('Username already exists');
      }

      return invalid(error.message);
    }
  }
}

export default AuthService;
