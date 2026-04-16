ALTER TABLE competition_login_history
ADD COLUMN competition_id INT NULL AFTER user_type,
ADD COLUMN login_status ENUM('success', 'failed', 'blocked') NOT NULL DEFAULT 'success' AFTER session_token,
ADD COLUMN failure_reason VARCHAR(500) NULL AFTER login_status,
ADD INDEX idx_competition_id (competition_id),
ADD INDEX idx_competition_fp_status_active (competition_id, device_fingerprint(191), login_status, is_active),
ADD INDEX idx_competition_mac_status_active (competition_id, mac_address(191), login_status, is_active),
ADD CONSTRAINT fk_login_history_competition
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL;
