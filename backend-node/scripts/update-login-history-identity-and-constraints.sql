USE cybercom_db;

DROP PROCEDURE IF EXISTS apply_login_history_identity_updates;
DELIMITER $$

CREATE PROCEDURE apply_login_history_identity_updates()
BEGIN
  DECLARE current_db_name VARCHAR(64);
  DECLARE foreign_key_name VARCHAR(64);

  SET current_db_name = DATABASE();

  ALTER TABLE competitions
  MODIFY COLUMN status ENUM('upcoming', 'active', 'paused', 'done', 'cancelled') DEFAULT 'upcoming';

  ALTER TABLE competition_team_members
  MODIFY COLUMN email VARCHAR(255) NOT NULL;

  ALTER TABLE competition_team_members
  MODIFY COLUMN status ENUM('online', 'offline', 'idle', 'disqualified') DEFAULT 'offline';

  UPDATE competition_team_members
  SET status = 'disqualified'
  WHERE status IS NULL OR status = '';

  IF EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_teams'
      AND index_name = 'name'
  ) THEN
    SET @drop_teams_name_index = 'ALTER TABLE competition_teams DROP INDEX `name`';
    PREPARE stmt FROM @drop_teams_name_index;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_teams'
      AND index_name = 'unique_competition_team_name'
  ) THEN
    SET @add_unique_team_name = 'ALTER TABLE competition_teams ADD UNIQUE KEY unique_competition_team_name (competition_id, name)';
    PREPARE stmt FROM @add_unique_team_name;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE competition_login_history
    ADD COLUMN admin_id INT NULL AFTER id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE competition_login_history
    ADD COLUMN team_member_id INT NULL AFTER admin_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND column_name = 'user_id'
  ) THEN
    UPDATE competition_login_history
    SET team_member_id = user_id
    WHERE user_type = 'team_member'
      AND user_id IS NOT NULL
      AND team_member_id IS NULL;

    SET foreign_key_name = NULL;
    SELECT constraint_name
    INTO foreign_key_name
    FROM information_schema.key_column_usage
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND column_name = 'user_id'
      AND referenced_table_name IS NOT NULL
    LIMIT 1;

    IF foreign_key_name IS NOT NULL THEN
      SET @drop_login_history_fk = CONCAT(
        'ALTER TABLE competition_login_history DROP FOREIGN KEY `',
        foreign_key_name,
        '`'
      );
      PREPARE stmt FROM @drop_login_history_fk;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = current_db_name
        AND table_name = 'competition_login_history'
        AND index_name = 'idx_user_id'
    ) THEN
      SET @drop_idx_user_id = 'ALTER TABLE competition_login_history DROP INDEX idx_user_id';
      PREPARE stmt FROM @drop_idx_user_id;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;

    ALTER TABLE competition_login_history
    DROP COLUMN user_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_competition_device_active'
  ) THEN
    SET @drop_old_device_index = 'ALTER TABLE competition_login_history DROP INDEX idx_competition_device_active';
    PREPARE stmt FROM @drop_old_device_index;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_admin_id'
  ) THEN
    SET @add_idx_admin_id = 'ALTER TABLE competition_login_history ADD INDEX idx_admin_id (admin_id)';
    PREPARE stmt FROM @add_idx_admin_id;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_team_member_id'
  ) THEN
    SET @add_idx_team_member_id = 'ALTER TABLE competition_login_history ADD INDEX idx_team_member_id (team_member_id)';
    PREPARE stmt FROM @add_idx_team_member_id;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_session_token'
  ) THEN
    SET @add_idx_session_token = 'ALTER TABLE competition_login_history ADD INDEX idx_session_token (session_token(191))';
    PREPARE stmt FROM @add_idx_session_token;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_competition_fp_status_active'
  ) THEN
    SET @add_idx_competition_fp = 'ALTER TABLE competition_login_history ADD INDEX idx_competition_fp_status_active (competition_id, device_fingerprint(191), login_status, is_active)';
    PREPARE stmt FROM @add_idx_competition_fp;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND index_name = 'idx_competition_mac_status_active'
  ) THEN
    SET @add_idx_competition_mac = 'ALTER TABLE competition_login_history ADD INDEX idx_competition_mac_status_active (competition_id, mac_address(191), login_status, is_active)';
    PREPARE stmt FROM @add_idx_competition_mac;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints
    WHERE constraint_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND constraint_name = 'fk_login_history_admin'
  ) THEN
    ALTER TABLE competition_login_history
    ADD CONSTRAINT fk_login_history_admin
      FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints
    WHERE constraint_schema = current_db_name
      AND table_name = 'competition_login_history'
      AND constraint_name = 'fk_login_history_team_member'
  ) THEN
    ALTER TABLE competition_login_history
    ADD CONSTRAINT fk_login_history_team_member
      FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE SET NULL;
  END IF;
END$$

DELIMITER ;

CALL apply_login_history_identity_updates();
DROP PROCEDURE apply_login_history_identity_updates;
