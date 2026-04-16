import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import CompetitionStatusService from '../services/CompetitionStatusService.js';
import TeamService from '../services/TeamService.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Token blacklist for logout (use Redis in production)
const tokenBlacklist = new Set();

const getAdminTokenFromRequest = req => {
  const headerToken = req.headers['x-admin-token'];

  if (headerToken) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return '';
};

// Middleware to verify admin JWT token
const isAdmin = (req, res, next) => {
  const adminToken = getAdminTokenFromRequest(req);

  if (!adminToken) {
    console.warn('[Admin Auth] Missing admin token');

    return res.status(401).json({ success: false, error: 'Admin token required' });
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(adminToken, JWT_SECRET);

    // Check if token is blacklisted (logged out)
    if (tokenBlacklist.has(adminToken)) {
      console.warn('[Admin Auth] Token has been revoked');

      return res.status(401).json({ success: false, error: 'Token has been revoked' });
    }

    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    req.adminToken = adminToken;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('[Admin Auth] Token expired');

      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      console.warn('[Admin Auth] Invalid token signature');

      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    console.error('[Admin Auth] Token verification error:', error.message);

    return res.status(401).json({ success: false, error: 'Invalid admin token' });
  }

  next();
};

// Get dashboard statistics
router.get('/admin/stats', isAdmin, async (req, res) => {
  try {
    await CompetitionStatusService.finalizeExpiredCompetitions(query);

    const [
      totalUserRows,
      totalCompetitionRows,
      activeCompetitionRows,
      totalTeamRows,
      totalChallengeRows,
      activeChallengeRows,
      totalSubmissionRows,
      recentSubmissionRows,
      practiceCategoryRows,
      competitionCategoryRows,
    ] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM practice_users'),
      query('SELECT COUNT(*) AS count FROM competitions'),
      query("SELECT COUNT(*) AS count FROM competitions WHERE status = 'active'"),
      query('SELECT COUNT(*) AS count FROM competition_teams'),
      query('SELECT COUNT(*) AS count FROM challenges'),
      query("SELECT COUNT(*) AS count FROM challenges WHERE status = 'active'"),
      query('SELECT COUNT(*) AS count FROM competition_submissions'),
      query(`
        SELECT COUNT(*) AS count
        FROM competition_submissions
        WHERE submitted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `),
      query(`
        SELECT
          c.id,
          c.name,
          COALESCE(practice_challenges.challenge_count, 0) AS challenges,
          COALESCE(practice_solves.solve_count, 0) AS solves
        FROM categories c
        LEFT JOIN (
          SELECT
            ch.category_id,
            COUNT(*) AS challenge_count
          FROM practice_challenges pc
          INNER JOIN challenges ch
            ON ch.id = pc.challenge_id
          WHERE ch.status = 'active'
          GROUP BY ch.category_id
        ) AS practice_challenges
          ON practice_challenges.category_id = c.id
        LEFT JOIN (
          SELECT
            ch.category_id,
            COUNT(*) AS solve_count
          FROM competition_submissions s
          INNER JOIN practice_challenges pc
            ON pc.challenge_id = s.challenge_id
          INNER JOIN challenges ch
            ON ch.id = s.challenge_id
          WHERE s.is_correct = 1
            AND s.competition_id IS NULL
          GROUP BY ch.category_id
        ) AS practice_solves
          ON practice_solves.category_id = c.id
        ORDER BY c.name ASC
      `),
      query(`
        SELECT
          c.id,
          c.name,
          COALESCE(competition_challenges.challenge_count, 0) AS challenges,
          COALESCE(competition_solves.solve_count, 0) AS solves
        FROM categories c
        LEFT JOIN (
          SELECT
            ch.category_id,
            COUNT(DISTINCT cc.challenge_id) AS challenge_count
          FROM competition_challenges cc
          INNER JOIN challenges ch
            ON ch.id = cc.challenge_id
          WHERE ch.status = 'active'
          GROUP BY ch.category_id
        ) AS competition_challenges
          ON competition_challenges.category_id = c.id
        LEFT JOIN (
          SELECT
            ch.category_id,
            COUNT(*) AS solve_count
          FROM competition_submissions s
          INNER JOIN challenges ch
            ON ch.id = s.challenge_id
          WHERE s.is_correct = 1
            AND s.competition_id IS NOT NULL
          GROUP BY ch.category_id
        ) AS competition_solves
          ON competition_solves.category_id = c.id
        ORDER BY c.name ASC
      `),
    ]);

    const mapCategoryStats = rows => rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      challenges: Number(row.challenges) || 0,
      solves: Number(row.solves) || 0,
    }));
    const stats = {
      totalCompetitions: Number(totalCompetitionRows[0]?.count) || 0,
      activeCompetitions: Number(activeCompetitionRows[0]?.count) || 0,
      totalTeams: Number(totalTeamRows[0]?.count) || 0,
      totalChallenges: Number(totalChallengeRows[0]?.count) || 0,
      recentSubmissions: Number(recentSubmissionRows[0]?.count) || 0,
      cards: {
        totalPracticeUsers: Number(totalUserRows[0]?.count) || 0,
        activeChallenges: Number(activeChallengeRows[0]?.count) || 0,
        activeCompetitions: Number(activeCompetitionRows[0]?.count) || 0,
        totalSubmissions: Number(totalSubmissionRows[0]?.count) || 0,
        totalCompetitions: Number(totalCompetitionRows[0]?.count) || 0,
        totalCompetitionParticipants: Number(totalTeamRows[0]?.count) || 0,
      },
      categories: {
        practice: mapCategoryStats(practiceCategoryRows),
        competition: mapCategoryStats(competitionCategoryRows),
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get all users with admin privileges (for admin management)
router.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT id, username, email, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    const results = await query(sql);
    res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get('/admin/practice-users', isAdmin, async (req, res) => {
  try {
    const sql = `
      SELECT id, username, email, status, created_at
      FROM practice_users
      ORDER BY created_at DESC
    `;
    const results = await query(sql);
    res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Update user role
router.put('/admin/users/:id/role', isAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'team_member', 'user'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    const result = await query(sql, [role, parseInt(req.params.id, 10)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Ban/unban user
router.put('/admin/users/:id/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'banned', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const sql = 'UPDATE users SET status = ? WHERE id = ?';
    const result = await query(sql, [status, parseInt(req.params.id, 10)]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User status updated successfully' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Add challenge to competition
router.post('/admin/competitions/:competition_id/challenges', isAdmin, async (req, res) => {
  try {
    const { challenge_id } = req.body;

    // Validate required fields
    if (challenge_id === undefined || challenge_id === null) {
      return res
        .status(400)
        .json({ success: false, error: 'challenge_id is required' });
    }

    const sql = `
      INSERT INTO competition_challenges (competition_id, challenge_id)
      VALUES (?, ?)
    `;

    await query(sql, [parseInt(req.params.competition_id, 10), challenge_id]);

    res.status(201).json({
      success: true,
      message: 'Challenge added to competition successfully',
    });
  } catch (error) {
    console.error('[Admin] Error adding challenge to competition:', error);
    return handleRouteError(res, error);
  }
});

// Remove challenge from competition
router.delete('/admin/competitions/:competition_id/challenges/:challenge_id', isAdmin, async (req, res) => {
  try {
    const sql
      = 'DELETE FROM competition_challenges WHERE competition_id = ? AND challenge_id = ?';
    const result = await query(sql, [
      parseInt(req.params.competition_id, 10),
      parseInt(req.params.challenge_id, 10),
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'Competition challenge not found' });
    }

    res.json({ success: true, message: 'Challenge removed from competition successfully' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get audit logs
router.get('/admin/logs', isAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const sql = `
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await query(sql, [parseInt(limit, 10), parseInt(offset, 10)]);
    res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post('/admin/team-members/:memberId/disqualify', isAdmin, async (req, res) => {
  try {
    const result = await TeamService.disqualifyTeamMember(
      parseInt(req.params.memberId, 10),
      { reason: req.body.reason }
    );

    if (!result.success) {
      return sendServiceResult(res, result, { defaultErrorStatus: 400 });
    }

    return res.json({
      success: true,
      data: result,
      message: `${result.username} has been disqualified and logged out.`,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Logout endpoint - revoke token
router.post('/logout/admin', isAdmin, (req, res) => {
  try {
    // Add token to blacklist (implementation for revocation)
    if (req.adminToken) {
      tokenBlacklist.add(req.adminToken);
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Admin Auth] Logout error:', error.message);
    return handleRouteError(res, error);
  }
});

export default router;
export { getAdminTokenFromRequest, isAdmin, tokenBlacklist };
