USE cybercom_db;

DROP PROCEDURE IF EXISTS apply_submission_attempt_tracking_updates;
DELIMITER $$

CREATE PROCEDURE apply_submission_attempt_tracking_updates()
BEGIN
  DECLARE current_db_name VARCHAR(64);

  SET current_db_name = DATABASE();

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'competition_id'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN competition_id INT NULL AFTER id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'team_member_id'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN team_member_id INT NULL AFTER team_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'submitted_flag'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE competition_submissions
    MODIFY COLUMN submitted_flag TEXT NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'is_correct'
  ) THEN
    ALTER TABLE competition_submissions
    MODIFY COLUMN is_correct BOOLEAN NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'submission_status'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN submission_status ENUM('correct', 'incorrect', 'limit_reached', 'already_solved') NOT NULL DEFAULT 'incorrect' AFTER is_correct;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'attempt_number'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN attempt_number INT NOT NULL DEFAULT 1 AFTER submission_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN ip_address VARCHAR(45) NULL AFTER attempt_number;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND column_name = 'device_fingerprint'
  ) THEN
    ALTER TABLE competition_submissions
    ADD COLUMN device_fingerprint VARCHAR(255) NULL AFTER ip_address;
  END IF;

  UPDATE competition_submissions s
  INNER JOIN competition_teams t ON t.id = s.team_id
  SET s.competition_id = t.competition_id
  WHERE s.competition_id IS NULL;

  UPDATE competition_submissions
  SET submission_status = CASE WHEN is_correct = 1 THEN 'correct' ELSE 'incorrect' END
  WHERE submission_status IS NULL
     OR submission_status NOT IN ('correct', 'incorrect', 'limit_reached', 'already_solved');

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND index_name = 'idx_submission_competition_time'
  ) THEN
    ALTER TABLE competition_submissions
    ADD INDEX idx_submission_competition_time (competition_id, submitted_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND index_name = 'idx_submission_team_challenge_time'
  ) THEN
    ALTER TABLE competition_submissions
    ADD INDEX idx_submission_team_challenge_time (team_id, challenge_id, submitted_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND index_name = 'idx_submission_member_challenge_time'
  ) THEN
    ALTER TABLE competition_submissions
    ADD INDEX idx_submission_member_challenge_time (team_member_id, challenge_id, submitted_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND index_name = 'idx_submission_team_challenge_correct'
  ) THEN
    ALTER TABLE competition_submissions
    ADD INDEX idx_submission_team_challenge_correct (team_id, challenge_id, is_correct);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints
    WHERE constraint_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND constraint_name = 'fk_submissions_competition'
  ) THEN
    ALTER TABLE competition_submissions
    ADD CONSTRAINT fk_submissions_competition
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints
    WHERE constraint_schema = current_db_name
      AND table_name = 'competition_submissions'
      AND constraint_name = 'fk_submissions_team_member'
  ) THEN
    ALTER TABLE competition_submissions
    ADD CONSTRAINT fk_submissions_team_member
      FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE SET NULL;
  END IF;
END$$

DELIMITER ;

CALL apply_submission_attempt_tracking_updates();
DROP PROCEDURE apply_submission_attempt_tracking_updates;
