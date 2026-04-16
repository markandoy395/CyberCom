SET @has_member_points := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'competition_team_members'
    AND COLUMN_NAME = 'points'
);

SET @drop_member_points_sql := IF(
  @has_member_points = 1,
  'ALTER TABLE competition_team_members DROP COLUMN points',
  'SELECT 1'
);

PREPARE drop_member_points_stmt FROM @drop_member_points_sql;
EXECUTE drop_member_points_stmt;
DEALLOCATE PREPARE drop_member_points_stmt;
