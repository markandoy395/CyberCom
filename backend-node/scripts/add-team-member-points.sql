ALTER TABLE competition_submissions
ADD COLUMN IF NOT EXISTS awarded_points INT NOT NULL DEFAULT 0 AFTER submission_status;

UPDATE competition_teams t
LEFT JOIN (
  SELECT solved.team_id, COALESCE(SUM(solved.points), 0) AS total_points
  FROM (
    SELECT s.team_id, s.challenge_id, MAX(s.awarded_points) AS points
    FROM competition_submissions s
    WHERE s.is_correct = 1
    GROUP BY s.team_id, s.challenge_id
  ) solved
  GROUP BY solved.team_id
) totals ON totals.team_id = t.id
SET t.points = COALESCE(totals.total_points, 0),
    t.score = COALESCE(totals.total_points, 0);

