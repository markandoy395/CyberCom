import express from 'express';
import { attachCompetitionMemberIfPresent } from '../middleware/competitionAuth.js';
import ChallengeService from '../services/ChallengeService.js';
import { query } from '../config/database.js';
import { handleRouteError, sendServiceResult } from '../utils/httpErrors.js';

const router = new express.Router();

// Hard-coded category colors (matches frontend constants)
const CATEGORY_COLORS = {
  1: '#06b6d4', // Web Exploitation - cyan
  2: '#ec4899', // Cryptography - pink
  3: '#8b5cf6', // Forensics - purple
  4: '#14b8a6', // Reverse Engineering - teal
  5: '#f97316', // Binary Exploitation - orange
};

const toInt = value => parseInt(value, 10);
const getCategoryColor = categoryId => CATEGORY_COLORS[categoryId] || '#6b7280';
const addCategoryColor = challenge => {
  const decryptedChallenge = ChallengeService.decryptChallenge(challenge);
  const hasFlag = Boolean(decryptedChallenge.flag);

  delete decryptedChallenge.flag;

  return {
    ...decryptedChallenge,
    hasFlag,
    category_color: getCategoryColor(challenge.category_id),
  };
};

const buildChallengeWhereClause = filters => {
  const clauses = [];
  const params = [];

  if (filters.category_id) {
    clauses.push('c.category_id = ?');
    params.push(filters.category_id);
  }

  if (filters.difficulty) {
    clauses.push('c.difficulty = ?');
    params.push(filters.difficulty);
  }

  if (filters.status) {
    clauses.push('c.status = ?');
    params.push(filters.status);
  }

  return {
    whereSql: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
    params,
  };
};

// Get all challenges
router.get('/challenges', async (req, res) => {
  try {
    const sanitize = req.query.sanitize === '1';
    const mode = req.query.mode;
    const filters = {
      category_id: req.query.category_id ? toInt(req.query.category_id) : null,
      difficulty: req.query.difficulty,
      status: req.query.status,
    };

    if (mode === 'practice') {
      const { whereSql, params } = buildChallengeWhereClause(filters);
      const results = await query(
        `SELECT c.*
         FROM practice_challenges pc
         INNER JOIN challenges c ON c.id = pc.challenge_id
         WHERE 1 = 1${whereSql}
         ORDER BY pc.created_at DESC`,
        params
      );
      const data = ChallengeService.decryptChallenges(results);

      return res.json({
        success: true,
        data: sanitize ? data.map(addCategoryColor) : data,
      });
    }

    const result = await ChallengeService.getChallenges(filters);

    if (sanitize && result?.success && Array.isArray(result.data)) {
      return res.json({
        ...result,
        data: result.data.map(addCategoryColor),
      });
    }

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get challenge by ID
router.get('/challenges/:id', async (req, res) => {
  try {
    const result = await ChallengeService.getChallengeById(toInt(req.params.id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Create challenge
router.post('/challenges', async (req, res) => {
  try {
    const result = await ChallengeService.createChallenge(req.body);
    if (result && result.status) {
      return res.status(result.status).json(result);
    }

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Update challenge
router.put('/challenges/:id', async (req, res) => {
  try {
    const challengeId = toInt(req.params.id);
    const { mode, ...challengeUpdates } = req.body || {};

    if (mode !== undefined) {
      if (!['practice', 'competition'].includes(mode)) {
        return res.status(400).json({ success: false, error: 'Invalid mode value' });
      }

      const existingChallenge = await query(
        'SELECT id FROM challenges WHERE id = ? LIMIT 1',
        [challengeId]
      );

      if (existingChallenge.length === 0) {
        return res.status(404).json({ success: false, error: 'Challenge not found' });
      }

      if (mode === 'practice') {
        await query(
          `INSERT INTO practice_challenges (challenge_id)
           VALUES (?)
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [challengeId]
        );
      } else {
        await query(
          'DELETE FROM practice_challenges WHERE challenge_id = ?',
          [challengeId]
        );
      }

      if (Object.keys(challengeUpdates).length === 0) {
        return res.json({
          success: true,
          message: mode === 'practice'
            ? 'Challenge added to practice pool'
            : 'Challenge removed from practice pool',
        });
      }
    }

    const result = await ChallengeService.updateChallenge(challengeId, challengeUpdates);
    if (result && result.status) {
      return res.status(result.status).json(result);
    }

    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Delete challenge
router.delete('/challenges/:id', async (req, res) => {
  try {
    const result = await ChallengeService.deleteChallenge(toInt(req.params.id));
    return sendServiceResult(res, result);
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const results = await query('SELECT id, name, description FROM categories ORDER BY name ASC');
    res.json({ success: true, data: results });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Get challenges for a specific competition
router.get('/competitions/:competitionId/challenges', attachCompetitionMemberIfPresent, async (req, res) => {
  try {
    const competitionId = toInt(req.params.competitionId);
    const isParticipantCompetitionView = req.query.team_id !== undefined;

    if (isParticipantCompetitionView && !req.competitionMemberId) {
      return res.status(401).json({ success: false, error: 'Competition token required' });
    }

    if (
      req.competitionMemberId
      && req.competitionSessionCompetitionId
      && competitionId !== req.competitionSessionCompetitionId
    ) {
      return res.status(403).json({ success: false, error: 'Competition access denied' });
    }

    const teamId = req.competitionMemberId
      ? req.competitionSessionTeamId
      : (req.query.team_id ? toInt(req.query.team_id) : null);

    const results = await query(
      `SELECT c.*,
              cc.id AS competition_challenges_id,
              cat.name AS category_name,
              c.category_id,
              CASE
                WHEN ? IS NOT NULL AND EXISTS (
                  SELECT 1
                  FROM submissions s
                  WHERE s.team_id = ?
                  AND s.challenge_id = c.id
                  AND s.is_correct = 1
                  AND ((s.competition_id IS NULL AND cc.competition_id IS NULL) OR s.competition_id = cc.competition_id)
                ) THEN 1
                ELSE 0
              END AS team_solved
       FROM competition_challenges cc
       JOIN challenges c ON cc.challenge_id = c.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE cc.competition_id = ?
       ORDER BY c.difficulty, c.title`,
      [teamId, teamId, competitionId]
    );

    res.json({ success: true, data: results.map(addCategoryColor) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Add challenge to competition
router.post('/competitions/:competitionId/challenges', async (req, res) => {
  try {
    const competitionId = toInt(req.params.competitionId);
    const { challenge_id } = req.body;

    if (!challenge_id) {
      return res.status(400).json({ success: false, error: 'Challenge ID is required' });
    }

    // Check if already exists
    const existing = await query(
      'SELECT id FROM competition_challenges WHERE competition_id = ? AND challenge_id = ?',
      [competitionId, challenge_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Challenge already assigned to this competition' });
    }

    // Insert new assignment
    const result = await query(
      'INSERT INTO competition_challenges (competition_id, challenge_id) VALUES (?, ?)',
      [competitionId, challenge_id]
    );

    res.json({ success: true, data: { id: result.insertId, competition_id: competitionId, challenge_id } });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

// Remove challenge from competition
router.delete('/competitions/:competitionId/challenges/:challengeId', async (req, res) => {
  try {
    const competitionId = toInt(req.params.competitionId);
    const challengeId = toInt(req.params.challengeId);

    const result = await query(
      'DELETE FROM competition_challenges WHERE competition_id = ? AND id = ?',
      [competitionId, challengeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Challenge assignment not found' });
    }

    res.json({ success: true, message: 'Challenge removed from competition' });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export default router;
