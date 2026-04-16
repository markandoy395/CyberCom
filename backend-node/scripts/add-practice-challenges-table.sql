CREATE TABLE IF NOT EXISTS practice_challenges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challenge_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_practice_challenge (challenge_id),
  KEY idx_practice_challenges_created_at (created_at),
  CONSTRAINT fk_practice_challenges_challenge
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
    ON DELETE CASCADE
);
