-- =====================================================
-- CyberCom CTF Platform - Complete Database Schema
-- =====================================================
-- Drop compatibility views first
DROP VIEW IF EXISTS leaderboard;
DROP VIEW IF EXISTS team_member_rankings;
DROP VIEW IF EXISTS team_rankings;
DROP VIEW IF EXISTS submissions;
DROP VIEW IF EXISTS team_members;
DROP VIEW IF EXISTS teams;
DROP VIEW IF EXISTS login_history;

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS competition_team_member_rankings;
DROP TABLE IF EXISTS competition_team_rankings;
DROP TABLE IF EXISTS competition_submissions;
DROP TABLE IF EXISTS competition_login_history;
DROP TABLE IF EXISTS competition_member_hint_opens;
DROP TABLE IF EXISTS competition_live_monitor;
DROP TABLE IF EXISTS competition_challenges;
DROP TABLE IF EXISTS challenges;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS competition_rules;
DROP TABLE IF EXISTS competition_team_members;
DROP TABLE IF EXISTS competition_teams;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS practice_users;
DROP TABLE IF EXISTS admin;
DROP DATABASE IF EXISTS cybercom_db;

-- Create the database
CREATE DATABASE IF NOT EXISTS cybercom_db;
USE cybercom_db;

-- Create admin table (no dependencies)
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create practice users table
CREATE TABLE IF NOT EXISTS practice_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_practice_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competitions table (depends on admin)
CREATE TABLE IF NOT EXISTS competitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description LONGTEXT,
    status ENUM('upcoming', 'active', 'paused', 'done', 'cancelled') DEFAULT 'upcoming',
    max_participants INT DEFAULT 8,
    participant_count INT DEFAULT 0,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    solver_weight DECIMAL(4,2) DEFAULT 0.80,
    time_weight DECIMAL(4,2) DEFAULT 0.20,
    solver_decay_constant DECIMAL(5,3) DEFAULT 0.120,
    attempt_penalty_constant DECIMAL(5,3) DEFAULT 0.050,
    min_score_floor INT DEFAULT 10,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competition rules table (depends on competitions)
CREATE TABLE IF NOT EXISTS competition_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_competition_rule_order (competition_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competition teams table (depends on competitions)
CREATE TABLE IF NOT EXISTS competition_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    max_members INT DEFAULT 4,
    points INT DEFAULT 0,
    competition_id INT,
    score INT DEFAULT 0,
    rank INT,
    status ENUM('registered', 'active', 'disqualified', 'completed') DEFAULT 'registered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
    UNIQUE KEY unique_competition_team_name (competition_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competition team members table (depends on competition teams)
CREATE TABLE IF NOT EXISTS competition_team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    team_id INT NOT NULL,
    role ENUM('captain', 'co-captain', 'member', 'leader') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    last_seen_at TIMESTAMP NULL,
    is_online BOOLEAN DEFAULT 0,
    status ENUM('online', 'offline', 'idle', 'disqualified') DEFAULT 'offline',
    FOREIGN KEY (team_id) REFERENCES competition_teams(id) ON DELETE CASCADE,
    INDEX idx_team_members_presence (is_online, last_seen_at),
    INDEX idx_team_members_team_presence (team_id, is_online, last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create challenges table (depends on categories)
CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    hints LONGTEXT,
    category_id INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    points INT DEFAULT 100,
    flag LONGTEXT NOT NULL,
    resources LONGTEXT,
    status ENUM('active', 'inactive', 'under_maintenance', 'draft') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competition_challenges table (junction table, depends on competitions and challenges)
CREATE TABLE IF NOT EXISTS competition_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    challenge_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_comp_challenge (competition_id, challenge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create competition submissions table (depends on competition teams and challenges)
CREATE TABLE IF NOT EXISTS competition_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NULL,
    team_id INT NOT NULL,
    team_member_id INT NULL,
    challenge_id INT NOT NULL,
    submitted_flag TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT 0,
    submission_status ENUM('correct', 'incorrect', 'limit_reached', 'already_solved') NOT NULL DEFAULT 'incorrect',
    awarded_points INT NOT NULL DEFAULT 0,
    attempt_number INT NOT NULL DEFAULT 1,
    ip_address VARCHAR(45) NULL,
    device_fingerprint VARCHAR(255) NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES competition_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE SET NULL,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    INDEX idx_submission_competition_time (competition_id, submitted_at),
    INDEX idx_submission_team_challenge_time (team_id, challenge_id, submitted_at),
    INDEX idx_submission_member_challenge_time (team_member_id, challenge_id, submitted_at),
    INDEX idx_submission_team_challenge_correct (team_id, challenge_id, is_correct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS competition_live_monitor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    competition_id INT NOT NULL,
    team_id INT NOT NULL,
    team_member_id INT NOT NULL,
    current_challenge_id INT NULL,
    activity_status ENUM('idle', 'solving') NOT NULL DEFAULT 'idle',
    is_tab_active BOOLEAN NOT NULL DEFAULT 1,
    last_tab_blur TIMESTAMP NULL,
    current_challenge_viewed_at TIMESTAMP NULL,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES competition_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (current_challenge_id) REFERENCES challenges(id) ON DELETE SET NULL,
    UNIQUE KEY unique_live_monitor_member (team_member_id),
    INDEX idx_live_monitor_competition (competition_id),
    INDEX idx_live_monitor_competition_activity (competition_id, last_heartbeat_at),
    INDEX idx_live_monitor_competition_status (competition_id, activity_status, is_tab_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- Competition login history table (tracks all logins with device info)
CREATE TABLE IF NOT EXISTS competition_login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    team_member_id INT NULL,
    username VARCHAR(255),
    user_type ENUM('admin', 'team_member') DEFAULT 'team_member',
    competition_id INT NULL,
    device_fingerprint VARCHAR(255), -- Device fingerprint from request/device traits
    device_name VARCHAR(255), -- Device name or description
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent VARCHAR(512), -- Browser User-Agent string
    browser VARCHAR(100), -- Extracted browser name
    os VARCHAR(100), -- Operating system
    mac_address VARCHAR(255), -- MAC address or client-side device identifier
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT 1, -- Whether this session is still active
    session_token VARCHAR(500), -- JWT token for this login
    login_status ENUM('success', 'failed', 'blocked') DEFAULT 'success',
    failure_reason VARCHAR(500) NULL,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE SET NULL,
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE SET NULL,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE SET NULL,
    INDEX idx_admin_id (admin_id),
    INDEX idx_team_member_id (team_member_id),
    INDEX idx_competition_id (competition_id),
    INDEX idx_device_fingerprint (device_fingerprint(191)),
    INDEX idx_username (username(191)),
    INDEX idx_login_time (login_time),
    INDEX idx_session_token (session_token(191)),
    INDEX idx_competition_fp_status_active (competition_id, device_fingerprint(191), login_status, is_active),
    INDEX idx_competition_mac_status_active (competition_id, mac_address(191), login_status, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Competition member hint opens tracking (tracks hint opens per team member per challenge)
CREATE TABLE IF NOT EXISTS competition_member_hint_opens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    competition_id INT NOT NULL,
    challenge_id INT NOT NULL,
    team_member_id INT NOT NULL,
    hint_open_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_member_challenge_hint (competition_id, challenge_id, team_member_id),
    KEY idx_member_hint_opens (team_member_id, competition_id),
    KEY idx_challenge_hint_opens (challenge_id, competition_id),
    
    FOREIGN KEY (team_member_id) REFERENCES competition_team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    competition_teams.id,
    competition_teams.name,
    competition_teams.points,
    COUNT(DISTINCT competition_submissions.challenge_id) as challenges_solved
FROM competition_teams
LEFT JOIN competition_submissions
  ON competition_teams.id = competition_submissions.team_id
 AND competition_submissions.is_correct = 1
GROUP BY competition_teams.id
ORDER BY competition_teams.points DESC;

-- Compatibility views for existing backend queries
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

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Web Exploitation', 'Web vulnerabilities and exploits'),
('Cryptography', 'Cryptographic challenges'),
('Forensics', 'Digital forensics challenges'),
('Reverse Engineering', 'Binary analysis and reverse engineering'),
('Binary Exploitation', 'Binary exploitation challenges');

-- Insert default admin user (password: admin123)
INSERT INTO admin (username, email, password_hash, role, is_active) VALUES
('admin', 'admin@cybercom.local', '$2a$10$WlW8yb/tgMeFQAOczxs/DOkkwgUIBCqIdV118NXUt8knZ9jNWQ0FK', 'super_admin', 1);
