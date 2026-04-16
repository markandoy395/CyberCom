USE cybercom_db;

ALTER TABLE competitions
MODIFY COLUMN status ENUM('upcoming', 'active', 'paused', 'done', 'cancelled') DEFAULT 'upcoming';

UPDATE competitions
SET status = 'upcoming'
WHERE status IS NULL OR status = '';
