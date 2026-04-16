import { getConnection, query } from '../config/database.js';

const DEFAULT_RULES = {
  competition: [
    'Only use this platform to complete challenges',
    'Developer Tools are disabled (F12, Ctrl+Shift+I, etc.)',
    'Tab switching is disabled (Tab key, Windows+Tab, Cmd+Tab)',
    'Address bar access is disabled (Ctrl+L, Cmd+L)',
    'Right-click context menu is disabled',
    'Any attempt to bypass restrictions will be logged',
    'Cheating will result in immediate disqualification',
    'Your activities are being monitored',
  ],
  practice: [
    'Only use this platform to practice cybersecurity skills',
    'Respect other users and their progress',
    'Do not share solutions or flags publicly',
    'Do not attempt to bypass security measures',
    'Report any bugs or vulnerabilities responsibly',
    'Maintain academic integrity in your learning',
    'Engage with the community constructively',
    'Have fun and learn from each challenge',
  ],
};

const RULE_TABLES = {
  competition: 'competition_rules',
  practice: 'practice_rules',
};
const CREATE_TABLE_QUERIES = {
  practice: `CREATE TABLE IF NOT EXISTS practice_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_practice_rule_order (display_order)
  )`,
  competition: `CREATE TABLE IF NOT EXISTS competition_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_competition_rule_order (display_order)
  )`,
};

const normalizeType = type => {
  const normalizedType = String(type || '').trim().toLowerCase();

  if (!RULE_TABLES[normalizedType]) {
    throw new Error('Invalid rule type. Use "competition" or "practice".');
  }

  return normalizedType;
};

const getTableName = type => RULE_TABLES[normalizeType(type)];

const getDefaultRules = type => [...DEFAULT_RULES[normalizeType(type)]];
const getMissingTableMessage = () => (
  'Rules tables not found. Run backend-node/scripts/add-global-rules-tables.sql before using the global rules API.'
);
const isMissingTableError = error => error?.code === 'ER_NO_SUCH_TABLE';

const ensureRulesTableExists = async type => {
  await query(CREATE_TABLE_QUERIES[type]);
};

const getTableRowCount = async type => {
  const tableName = getTableName(type);
  const rows = await query(`SELECT COUNT(*) AS count FROM ${tableName}`);

  return rows[0]?.count || 0;
};

const seedRulesIfEmpty = async type => {
  const existingCount = await getTableRowCount(type);

  if (existingCount > 0) {
    return;
  }

  const defaultRules = getDefaultRules(type);
  const connection = await getConnection();
  const tableName = getTableName(type);

  try {
    await connection.beginTransaction();

    for (const [index, ruleText] of defaultRules.entries()) {
      await connection.execute(
        `INSERT INTO ${tableName} (rule_text, display_order)
         VALUES (?, ?)`,
        [ruleText, index + 1]
      );
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Keep the original error when rollback fails.
    }

    throw error;
  } finally {
    connection.release();
  }
};

const validateLegacyCompetitionRulesSchema = async type => {
  if (type !== 'competition') {
    return;
  }

  const rows = await query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = 'competition_id'`,
    [RULE_TABLES.competition]
  );

  if (rows[0]?.count > 0) {
    const legacyRowCount = await getTableRowCount(type);

    if (legacyRowCount === 0) {
      await query(`DROP TABLE ${RULE_TABLES.competition}`);
      await ensureRulesTableExists(type);
      await seedRulesIfEmpty(type);
      return;
    }

    throw new Error(
      'Legacy competition_rules schema detected. Run backend-node/scripts/add-global-rules-tables.sql before using the global rules API.'
    );
  }
};

const sanitizeRules = rules => {
  if (!Array.isArray(rules)) {
    throw new Error('Rules must be provided as an array.');
  }

  const normalizedRules = rules.map(rule => {
    if (typeof rule !== 'string') {
      throw new Error('Each rule must be a string.');
    }

    const trimmedRule = rule.trim();

    if (!trimmedRule) {
      throw new Error('Rule text cannot be empty.');
    }

    return trimmedRule;
  });

  if (normalizedRules.length === 0) {
    throw new Error('At least one rule is required.');
  }

  return normalizedRules;
};

const loadStoredRules = async type => {
  const tableName = getTableName(type);
  const rows = await query(
    `SELECT id, rule_text, display_order
     FROM ${tableName}
     ORDER BY display_order ASC, id ASC`
  );

  return rows.map(row => row.rule_text);
};

const withRulesTransaction = async (type, rules) => {
  const tableName = getTableName(type);
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(`DELETE FROM ${tableName}`);

    for (const [index, ruleText] of rules.entries()) {
      await connection.execute(
        `INSERT INTO ${tableName} (rule_text, display_order)
         VALUES (?, ?)`,
        [ruleText, index + 1]
      );
    }

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Keep the original error when rollback fails.
    }

    throw error;
  } finally {
    connection.release();
  }
};

class RulesService {
  static normalizeType(type) {
    return normalizeType(type);
  }

  static getDefaultRules(type) {
    return getDefaultRules(type);
  }

  static async getRules(typeInput) {
    const type = normalizeType(typeInput);
    await ensureRulesTableExists(type);
    await validateLegacyCompetitionRulesSchema(type);

    let storedRules = [];

    try {
      storedRules = await loadStoredRules(type);
    } catch (error) {
      if (!isMissingTableError(error)) {
        throw error;
      }

      await ensureRulesTableExists(type);
      await seedRulesIfEmpty(type);
      storedRules = await loadStoredRules(type);
    }

    const rules = storedRules.length > 0 ? storedRules : getDefaultRules(type);

    return {
      type,
      tableName: RULE_TABLES[type],
      rules,
      source: storedRules.length > 0 ? 'database' : 'defaults',
    };
  }

  static async replaceRules(typeInput, rulesInput) {
    const type = normalizeType(typeInput);
    await ensureRulesTableExists(type);
    await validateLegacyCompetitionRulesSchema(type);

    const rules = sanitizeRules(rulesInput);

    try {
      await withRulesTransaction(type, rules);
    } catch (error) {
      if (isMissingTableError(error)) {
        throw new Error(getMissingTableMessage());
      }

      throw error;
    }

    return this.getRules(type);
  }

  static async resetRules(typeInput) {
    const type = normalizeType(typeInput);

    return this.replaceRules(type, getDefaultRules(type));
  }
}

export default RulesService;
