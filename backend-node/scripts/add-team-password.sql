-- Add team password for competition login
ALTER TABLE competition_teams ADD COLUMN password VARCHAR(255) NULL AFTER name;

-- Add index for team login tracking
CREATE INDEX idx_team_password ON competition_teams(id);
