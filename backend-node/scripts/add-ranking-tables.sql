CREATE TABLE IF NOT EXISTS competition_team_rankings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    team_id INT NOT NULL,
    points INT NOT NULL DEFAULT 0,
    challenges_solved INT NOT NULL DEFAULT 0,
    member_count INT NOT NULL DEFAULT 0,
    rank_position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES competition_teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_ranking (competition_id, team_id),
    INDEX idx_team_ranking_order (competition_id, rank_position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS competition_team_member_rankings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    team_id INT NOT NULL,
    team_member_id INT NOT NULL,
    points INT NOT NULL DEFAULT 0,
    challenges_solved INT NOT NULL DEFAULT 0,
    rank_position INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES competition_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE CASCADE,
    UNIQUE KEY unique_member_ranking (competition_id, team_member_id),
    INDEX idx_member_ranking_order (competition_id, rank_position),
    INDEX idx_member_team_lookup (competition_id, team_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
