USE cybercom_db;

ALTER TABLE competition_team_members
MODIFY COLUMN status ENUM('online', 'offline', 'idle', 'disqualified') DEFAULT 'offline';

UPDATE competition_team_members
SET status = 'disqualified'
WHERE status IS NULL OR status = '';
