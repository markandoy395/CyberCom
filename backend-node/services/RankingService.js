import { query } from '../config/database.js';

const nullSafeCompetitionClause = '((? IS NULL AND s.competition_id IS NULL) OR s.competition_id = ?)';
const teamRankingSelect = `
  SELECT
    t.id AS team_id,
    t.name AS team_name,
    t.points,
    COUNT(DISTINCT s.challenge_id) AS challenges_solved,
    COUNT(DISTINCT tm.id) AS member_count
  FROM teams t
  LEFT JOIN team_members tm ON tm.team_id = t.id
  LEFT JOIN submissions s
    ON s.team_id = t.id
   AND s.is_correct = 1
   AND ${nullSafeCompetitionClause}
  WHERE t.competition_id = ?
  GROUP BY t.id, t.name, t.points
  ORDER BY t.points DESC, challenges_solved DESC, t.name ASC
`;
const memberRankingSelect = `
  SELECT
    tm.id AS team_member_id,
    tm.team_id,
    tm.username,
    tm.name,
    COALESCE(SUM(member_scores.points), 0) AS points,
    COUNT(member_scores.challenge_id) AS challenges_solved
  FROM team_members tm
  INNER JOIN teams t ON t.id = tm.team_id
  LEFT JOIN (
    SELECT
      s.team_member_id,
      s.team_id,
      s.challenge_id,
      MAX(s.awarded_points) AS points
    FROM submissions s
    WHERE s.is_correct = 1
      AND s.team_member_id IS NOT NULL
      AND ${nullSafeCompetitionClause}
    GROUP BY s.team_member_id, s.team_id, s.challenge_id
  ) member_scores
    ON member_scores.team_member_id = tm.id
   AND member_scores.team_id = tm.team_id
  WHERE t.competition_id = ?
  GROUP BY tm.id, tm.team_id, tm.username, tm.name
  ORDER BY points DESC, challenges_solved DESC, tm.username ASC
`;
const createExecutor = connection => ({
  read: async (sql, params = []) => {
    if (connection) {
      const [rows] = await connection.execute(sql, params);

      return rows;
    }

    return query(sql, params);
  },
  write: async (sql, params = []) => {
    if (connection) {
      const [result] = await connection.execute(sql, params);

      return result;
    }

    return query(sql, params);
  },
});

export class RankingService {
  static async rebuildCompetitionRankings(competitionId, connection = null) {
    if (!competitionId) {
      return { success: false, error: 'competitionId is required' };
    }

    const executor = createExecutor(connection);
    const teams = await executor.read(teamRankingSelect, [competitionId, competitionId, competitionId]);
    const members = await executor.read(memberRankingSelect, [competitionId, competitionId, competitionId]);

    await executor.write('DELETE FROM team_member_rankings WHERE competition_id = ?', [competitionId]);
    await executor.write('DELETE FROM team_rankings WHERE competition_id = ?', [competitionId]);

    for (const [index, team] of teams.entries()) {
      await executor.write(
        `INSERT INTO team_rankings (
          competition_id, team_id, points, challenges_solved, member_count, rank_position
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          competitionId,
          team.team_id,
          Number.parseInt(team.points, 10) || 0,
          Number.parseInt(team.challenges_solved, 10) || 0,
          Number.parseInt(team.member_count, 10) || 0,
          index + 1,
        ]
      );
    }

    for (const [index, member] of members.entries()) {
      await executor.write(
        `INSERT INTO team_member_rankings (
          competition_id, team_id, team_member_id, points, challenges_solved, rank_position
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          competitionId,
          member.team_id,
          member.team_member_id,
          Number.parseInt(member.points, 10) || 0,
          Number.parseInt(member.challenges_solved, 10) || 0,
          index + 1,
        ]
      );
    }

    return {
      success: true,
      data: {
        teams: teams.length,
        members: members.length,
      },
    };
  }

  static async getCompetitionRankings(competitionId) {
    if (!competitionId) {
      return { success: false, error: 'competitionId is required' };
    }

    await this.rebuildCompetitionRankings(competitionId);

    const teams = await query(
      `SELECT
         tr.rank_position,
         tr.points,
         tr.challenges_solved,
         tr.member_count,
         t.id,
         t.name
       FROM team_rankings tr
       INNER JOIN teams t ON t.id = tr.team_id
       WHERE tr.competition_id = ?
       ORDER BY tr.rank_position ASC`,
      [competitionId]
    );
    const members = await query(
      `SELECT
         mr.rank_position,
         mr.points,
         mr.challenges_solved,
         mr.team_id,
         tm.id,
         tm.username,
         tm.name,
         t.name AS team_name
       FROM team_member_rankings mr
       INNER JOIN team_members tm ON tm.id = mr.team_member_id
       INNER JOIN teams t ON t.id = mr.team_id
       WHERE mr.competition_id = ?
       ORDER BY mr.rank_position ASC`,
      [competitionId]
    );
    const membersByTeam = members.reduce((accumulator, member) => {
      if (!accumulator[member.team_id]) {
        accumulator[member.team_id] = [];
      }

      accumulator[member.team_id].push(member);

      return accumulator;
    }, {});

    return {
      success: true,
      data: {
        teams: teams.map(team => ({
          ...team,
          members: membersByTeam[team.id] || [],
        })),
        members,
      },
    };
  }
}

export default RankingService;
