SET @has_competition_rules_table := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'competition_rules'
);

SET @competition_rules_has_legacy_schema := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'competition_rules'
      AND column_name = 'competition_id'
);

SET @drop_legacy_rules_backup_sql := IF(
    @competition_rules_has_legacy_schema > 0,
    'DROP TEMPORARY TABLE IF EXISTS legacy_competition_rules_backup',
    'SELECT 1'
);
PREPARE drop_legacy_rules_backup_stmt FROM @drop_legacy_rules_backup_sql;
EXECUTE drop_legacy_rules_backup_stmt;
DEALLOCATE PREPARE drop_legacy_rules_backup_stmt;

SET @backup_legacy_rules_sql := IF(
    @competition_rules_has_legacy_schema > 0,
    'CREATE TEMPORARY TABLE legacy_competition_rules_backup AS SELECT * FROM competition_rules',
    'SELECT 1'
);
PREPARE backup_legacy_rules_stmt FROM @backup_legacy_rules_sql;
EXECUTE backup_legacy_rules_stmt;
DEALLOCATE PREPARE backup_legacy_rules_stmt;

SET @legacy_competition_id_sql := IF(
    @competition_rules_has_legacy_schema > 0,
    'SELECT @legacy_competition_id := competition_id
     FROM legacy_competition_rules_backup
     ORDER BY competition_id, display_order, id
     LIMIT 1',
    'SELECT @legacy_competition_id := NULL'
);
PREPARE legacy_competition_id_stmt FROM @legacy_competition_id_sql;
EXECUTE legacy_competition_id_stmt;
DEALLOCATE PREPARE legacy_competition_id_stmt;

SET @drop_legacy_competition_rules_sql := IF(
    @competition_rules_has_legacy_schema > 0,
    'DROP TABLE competition_rules',
    'SELECT 1'
);
PREPARE drop_legacy_competition_rules_stmt FROM @drop_legacy_competition_rules_sql;
EXECUTE drop_legacy_competition_rules_stmt;
DEALLOCATE PREPARE drop_legacy_competition_rules_stmt;

CREATE TABLE IF NOT EXISTS practice_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_practice_rule_order (display_order)
);

CREATE TABLE IF NOT EXISTS competition_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_competition_rule_order (display_order)
);

SET @restore_legacy_competition_rules_sql := IF(
    @competition_rules_has_legacy_schema > 0 AND @legacy_competition_id IS NOT NULL,
    'INSERT INTO competition_rules (rule_text, display_order)
     SELECT rule_text, display_order
     FROM legacy_competition_rules_backup
     WHERE competition_id = @legacy_competition_id
     ORDER BY display_order, id',
    'SELECT 1'
);
PREPARE restore_legacy_competition_rules_stmt FROM @restore_legacy_competition_rules_sql;
EXECUTE restore_legacy_competition_rules_stmt;
DEALLOCATE PREPARE restore_legacy_competition_rules_stmt;

DROP TEMPORARY TABLE IF EXISTS legacy_competition_rules_backup;

INSERT INTO practice_rules (rule_text, display_order)
SELECT defaults.rule_text, defaults.display_order
FROM (
    SELECT 'Only use this platform to practice cybersecurity skills' AS rule_text, 1 AS display_order
    UNION ALL SELECT 'Respect other users and their progress', 2
    UNION ALL SELECT 'Do not share solutions or flags publicly', 3
    UNION ALL SELECT 'Do not attempt to bypass security measures', 4
    UNION ALL SELECT 'Report any bugs or vulnerabilities responsibly', 5
    UNION ALL SELECT 'Maintain academic integrity in your learning', 6
    UNION ALL SELECT 'Engage with the community constructively', 7
    UNION ALL SELECT 'Have fun and learn from each challenge', 8
) AS defaults
WHERE NOT EXISTS (
    SELECT 1
    FROM practice_rules
);

INSERT INTO competition_rules (rule_text, display_order)
SELECT defaults.rule_text, defaults.display_order
FROM (
    SELECT 'Only use this platform to complete challenges' AS rule_text, 1 AS display_order
    UNION ALL SELECT 'Developer Tools are disabled (F12, Ctrl+Shift+I, etc.)', 2
    UNION ALL SELECT 'Tab switching is disabled (Tab key, Windows+Tab, Cmd+Tab)', 3
    UNION ALL SELECT 'Address bar access is disabled (Ctrl+L, Cmd+L)', 4
    UNION ALL SELECT 'Right-click context menu is disabled', 5
    UNION ALL SELECT 'Any attempt to bypass restrictions will be logged', 6
    UNION ALL SELECT 'Cheating will result in immediate disqualification', 7
    UNION ALL SELECT 'Your activities are being monitored', 8
) AS defaults
WHERE NOT EXISTS (
    SELECT 1
    FROM competition_rules
);
