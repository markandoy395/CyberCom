-- Add access_pin column to competition_team_members to enable anonymous individual login tracking
ALTER TABLE competition_team_members ADD COLUMN access_pin VARCHAR(20) UNIQUE NULL AFTER team_id;

-- Add index for faster PIN lookups
CREATE INDEX idx_access_pin ON competition_team_members(access_pin);

-- Add competition_login_count to track individual logins per competition
ALTER TABLE competition_team_members ADD COLUMN competition_login_count INT DEFAULT 0 AFTER access_pin;
