CREATE TABLE IF NOT EXISTS competition_participant_audit_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  competition_id INT NOT NULL,
  team_id INT NULL,
  team_member_id INT NOT NULL,
  challenge_id INT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  metadata LONGTEXT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_participant_audit_member_time (team_member_id, occurred_at),
  KEY idx_participant_audit_competition_time (competition_id, occurred_at),
  KEY idx_participant_audit_member_challenge_time (team_member_id, challenge_id, occurred_at),
  CONSTRAINT fk_participant_audit_competition
    FOREIGN KEY (competition_id) REFERENCES competitions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_audit_team
    FOREIGN KEY (team_id) REFERENCES competition_teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_audit_member
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_audit_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS competition_participant_challenge_audits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  competition_id INT NOT NULL,
  team_id INT NOT NULL,
  team_member_id INT NOT NULL,
  challenge_id INT NOT NULL,
  challenge_title VARCHAR(255) NULL,
  category_id INT NULL,
  category_name VARCHAR(100) NULL,
  difficulty VARCHAR(20) NOT NULL,
  first_opened_at TIMESTAMP NULL,
  last_opened_at TIMESTAMP NULL,
  last_closed_at TIMESTAMP NULL,
  correct_submitted_at TIMESTAMP NULL,
  time_to_first_correct_seconds INT NULL,
  attempts_before_correct INT NULL,
  incorrect_submission_count INT NOT NULL DEFAULT 0,
  focus_loss_count INT NOT NULL DEFAULT 0,
  tab_hidden_count INT NOT NULL DEFAULT 0,
  copy_count INT NOT NULL DEFAULT 0,
  paste_count INT NOT NULL DEFAULT 0,
  reopen_count INT NOT NULL DEFAULT 0,
  last_copy_at TIMESTAMP NULL,
  last_paste_at TIMESTAMP NULL,
  expected_solve_minutes DECIMAL(10, 2) NULL,
  solve_speed_ratio DECIMAL(10, 4) NULL,
  suspicion_score INT NOT NULL DEFAULT 0,
  suspicion_reasons LONGTEXT NULL,
  monitor_recommended BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_participant_challenge_audit (competition_id, team_member_id, challenge_id),
  KEY idx_participant_challenge_audit_member (team_member_id),
  KEY idx_participant_challenge_audit_competition (competition_id, team_id),
  KEY idx_participant_challenge_audit_monitor (competition_id, monitor_recommended, suspicion_score),
  CONSTRAINT fk_participant_challenge_audit_competition
    FOREIGN KEY (competition_id) REFERENCES competitions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_challenge_audit_team
    FOREIGN KEY (team_id) REFERENCES competition_teams(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_challenge_audit_member
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_participant_challenge_audit_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    ON DELETE CASCADE
);
