DROP VIEW IF EXISTS leaderboard;
DROP VIEW IF EXISTS team_member_rankings;
DROP VIEW IF EXISTS team_rankings;
DROP VIEW IF EXISTS submissions;
DROP VIEW IF EXISTS team_members;
DROP VIEW IF EXISTS teams;
DROP VIEW IF EXISTS login_history;

SET @has_old_teams := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'teams'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_teams := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_teams'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_teams_sql := IF(
  @has_old_teams = 1 AND @has_new_teams = 0,
  'RENAME TABLE teams TO competition_teams',
  'SELECT 1'
);
PREPARE rename_teams_stmt FROM @rename_teams_sql;
EXECUTE rename_teams_stmt;
DEALLOCATE PREPARE rename_teams_stmt;

SET @has_old_team_members := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'team_members'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_team_members := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_members'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_team_members_sql := IF(
  @has_old_team_members = 1 AND @has_new_team_members = 0,
  'RENAME TABLE team_members TO competition_team_members',
  'SELECT 1'
);
PREPARE rename_team_members_stmt FROM @rename_team_members_sql;
EXECUTE rename_team_members_stmt;
DEALLOCATE PREPARE rename_team_members_stmt;

SET @has_old_submissions := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'submissions'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_submissions := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_submissions'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_submissions_sql := IF(
  @has_old_submissions = 1 AND @has_new_submissions = 0,
  'RENAME TABLE submissions TO competition_submissions',
  'SELECT 1'
);
PREPARE rename_submissions_stmt FROM @rename_submissions_sql;
EXECUTE rename_submissions_stmt;
DEALLOCATE PREPARE rename_submissions_stmt;

SET @has_old_team_rankings := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'team_rankings'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_team_rankings := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_rankings'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_team_rankings_sql := IF(
  @has_old_team_rankings = 1 AND @has_new_team_rankings = 0,
  'RENAME TABLE team_rankings TO competition_team_rankings',
  'SELECT 1'
);
PREPARE rename_team_rankings_stmt FROM @rename_team_rankings_sql;
EXECUTE rename_team_rankings_stmt;
DEALLOCATE PREPARE rename_team_rankings_stmt;

SET @has_old_team_member_rankings := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'team_member_rankings'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_team_member_rankings := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_member_rankings'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_team_member_rankings_sql := IF(
  @has_old_team_member_rankings = 1 AND @has_new_team_member_rankings = 0,
  'RENAME TABLE team_member_rankings TO competition_team_member_rankings',
  'SELECT 1'
);
PREPARE rename_team_member_rankings_stmt FROM @rename_team_member_rankings_sql;
EXECUTE rename_team_member_rankings_stmt;
DEALLOCATE PREPARE rename_team_member_rankings_stmt;

SET @has_old_login_history := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'login_history'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @has_new_login_history := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_login_history'
    AND TABLE_TYPE = 'BASE TABLE'
);
SET @rename_login_history_sql := IF(
  @has_old_login_history = 1 AND @has_new_login_history = 0,
  'RENAME TABLE login_history TO competition_login_history',
  'SELECT 1'
);
PREPARE rename_login_history_stmt FROM @rename_login_history_sql;
EXECUTE rename_login_history_stmt;
DEALLOCATE PREPARE rename_login_history_stmt;

CREATE TABLE IF NOT EXISTS competition_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_competition_rule_order (display_order)
);

CREATE OR REPLACE VIEW teams AS
SELECT * FROM competition_teams;

CREATE OR REPLACE VIEW team_members AS
SELECT * FROM competition_team_members;

CREATE OR REPLACE VIEW submissions AS
SELECT * FROM competition_submissions;

CREATE OR REPLACE VIEW team_rankings AS
SELECT * FROM competition_team_rankings;

CREATE OR REPLACE VIEW team_member_rankings AS
SELECT * FROM competition_team_member_rankings;

CREATE OR REPLACE VIEW login_history AS
SELECT * FROM competition_login_history;

CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    competition_teams.id,
    competition_teams.name,
    competition_teams.points,
    COUNT(DISTINCT competition_submissions.challenge_id) AS challenges_solved
FROM competition_teams
LEFT JOIN competition_submissions
  ON competition_teams.id = competition_submissions.team_id
 AND competition_submissions.is_correct = 1
GROUP BY competition_teams.id
ORDER BY competition_teams.points DESC;
