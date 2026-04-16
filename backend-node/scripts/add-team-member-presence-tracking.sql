SET @has_last_seen_at := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_members'
    AND COLUMN_NAME = 'last_seen_at'
);

SET @add_last_seen_at_sql := IF(
  @has_last_seen_at = 0,
  'ALTER TABLE competition_team_members ADD COLUMN last_seen_at TIMESTAMP NULL AFTER last_login',
  'SELECT 1'
);

PREPARE add_last_seen_at_stmt FROM @add_last_seen_at_sql;
EXECUTE add_last_seen_at_stmt;
DEALLOCATE PREPARE add_last_seen_at_stmt;

UPDATE competition_team_members
SET last_seen_at = COALESCE(last_seen_at, last_login, joined_at)
WHERE last_seen_at IS NULL;

SET @has_presence_index := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_members'
    AND INDEX_NAME = 'idx_team_members_presence'
);

SET @add_presence_index_sql := IF(
  @has_presence_index = 0,
  'ALTER TABLE competition_team_members ADD INDEX idx_team_members_presence (is_online, last_seen_at)',
  'SELECT 1'
);

PREPARE add_presence_index_stmt FROM @add_presence_index_sql;
EXECUTE add_presence_index_stmt;
DEALLOCATE PREPARE add_presence_index_stmt;

SET @has_team_presence_index := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_members'
    AND INDEX_NAME = 'idx_team_members_team_presence'
);

SET @add_team_presence_index_sql := IF(
  @has_team_presence_index = 0,
  'ALTER TABLE competition_team_members ADD INDEX idx_team_members_team_presence (team_id, is_online, last_seen_at)',
  'SELECT 1'
);

PREPARE add_team_presence_index_stmt FROM @add_team_presence_index_sql;
EXECUTE add_team_presence_index_stmt;
DEALLOCATE PREPARE add_team_presence_index_stmt;
