import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import RankingService from '../services/RankingService.js';
import { decrypt } from '../utils/encryption.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cybercom_db',
};

const toPoints = value => Number.parseInt(String(value), 10) || 0;

async function backfillAwardedPoints() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.query(
      `SELECT s.id, s.is_correct, ch.points AS encrypted_points
       FROM competition_submissions s
       INNER JOIN challenges ch ON ch.id = s.challenge_id`
    );

    for (const row of rows) {
      const awardedPoints = row.is_correct ? toPoints(decrypt(row.encrypted_points)) : 0;

      await connection.execute(
        'UPDATE competition_submissions SET awarded_points = ? WHERE id = ?',
        [awardedPoints, row.id]
      );
    }

    await connection.query(`
      UPDATE competition_teams t
      LEFT JOIN (
        SELECT solved.team_id, COALESCE(SUM(solved.points), 0) AS total_points
        FROM (
          SELECT s.team_id, s.challenge_id, MAX(s.awarded_points) AS points
          FROM competition_submissions s
          WHERE s.is_correct = 1
          GROUP BY s.team_id, s.challenge_id
        ) solved
        GROUP BY solved.team_id
      ) totals ON totals.team_id = t.id
      SET t.points = COALESCE(totals.total_points, 0),
          t.score = COALESCE(totals.total_points, 0)
    `);

    const [competitions] = await connection.query(
      'SELECT id FROM competitions ORDER BY id ASC'
    );

    for (const competition of competitions) {
      await RankingService.rebuildCompetitionRankings(competition.id, connection);
    }
  } finally {
    await connection.end();
  }
}

backfillAwardedPoints().catch(error => {
  console.error('Awarded points backfill failed:', error.message);
  process.exit(1);
});
