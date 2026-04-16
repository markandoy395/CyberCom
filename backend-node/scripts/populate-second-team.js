import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

const COMPETITION_ID = 2;
const TEAM_NAME = 'Hacker_B';
const TEAM_PASSWORD = 'CyberCom2026!';

const MEMBERS = [
  {
    username: 'hacker_5',
    name: 'Participant 5',
    email: 'hacker_5@cybercom.local',
    role: 'captain',
  },
  {
    username: 'hacker_6',
    name: 'Participant 6',
    email: 'hacker_6@cybercom.local',
    role: 'member',
  },
  {
    username: 'hacker_7',
    name: 'Participant 7',
    email: 'hacker_7@cybercom.local',
    role: 'member',
  },
  {
    username: 'hacker_8',
    name: 'Participant 8',
    email: 'hacker_8@cybercom.local',
    role: 'member',
  },
];

async function ensureCompetitionExists() {
  const competitions = await query(
    'SELECT id, name, status FROM competitions WHERE id = ? LIMIT 1',
    [COMPETITION_ID]
  );

  if (competitions.length === 0) {
    throw new Error(`Competition ${COMPETITION_ID} does not exist.`);
  }

  return competitions[0];
}

async function ensureSecondTeam() {
  const existingTeam = await query(
    'SELECT id, name FROM competition_teams WHERE competition_id = ? AND name = ? LIMIT 1',
    [COMPETITION_ID, TEAM_NAME]
  );

  if (existingTeam.length > 0) {
    const teamId = existingTeam[0].id;

    await query(
      'UPDATE competition_teams SET competition_id = ?, max_members = ? WHERE id = ?',
      [COMPETITION_ID, MEMBERS.length, teamId]
    );

    return { id: teamId, created: false };
  }

  const teamsInCompetition = await query(
    'SELECT id, name FROM competition_teams WHERE competition_id = ? ORDER BY id ASC',
    [COMPETITION_ID]
  );

  if (teamsInCompetition.length >= 2) {
    throw new Error(
      `Competition ${COMPETITION_ID} already has ${teamsInCompetition.length} competition_teams.`
    );
  }

  const result = await query(
    'INSERT INTO competition_teams (name, max_members, competition_id) VALUES (?, ?, ?)',
    [TEAM_NAME, MEMBERS.length, COMPETITION_ID]
  );

  return { id: result.insertId, created: true };
}

async function ensureMembers(teamId) {
  const created = [];
  const existing = [];
  const passwordHash = await bcrypt.hash(TEAM_PASSWORD, 10);

  for (const member of MEMBERS) {
    const rows = await query(
      'SELECT id, username, team_id FROM competition_team_members WHERE username = ? LIMIT 1',
      [member.username]
    );

    if (rows.length > 0) {
      const currentMember = rows[0];

      if (currentMember.team_id !== teamId) {
        throw new Error(
          `Username ${member.username} already exists on team ${currentMember.team_id}.`
        );
      }

      await query(
        `UPDATE competition_team_members
         SET name = ?, email = ?, role = ?
         WHERE id = ?`,
        [member.name, member.email, member.role, currentMember.id]
      );

      existing.push(member.username);
      continue;
    }

    await query(
      `INSERT INTO competition_team_members (username, name, email, password, team_id, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member.username, member.name, member.email, passwordHash, teamId, member.role]
    );

    created.push(member.username);
  }

  return { created, existing };
}

async function main() {
  try {
    await ensureCompetitionExists();
    const team = await ensureSecondTeam();
    await ensureMembers(team.id);
  } catch (error) {
    console.error(`Failed to populate second team: ${error.message}`);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();
