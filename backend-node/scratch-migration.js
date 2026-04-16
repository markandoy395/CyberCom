import { query, closePool } from './config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'scripts', 'add-competition-scoring-settings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration: add-competition-scoring-settings.sql');
    await query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
       console.log('Column already exists, ignoring.');
    } else {
       console.error('Migration failed:', error);
    }
  } finally {
    await closePool();
  }
}

runMigration();
