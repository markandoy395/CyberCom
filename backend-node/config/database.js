import 'dotenv/config.js';
import mysql from 'mysql2/promise.js';

// Validate required environment variables are set
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}. Please check your .env file.`);
}

const DEFAULT_DB_CONNECT_TIMEOUT_MS = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10);
const DEFAULT_DB_HEALTHCHECK_TIMEOUT_MS = parseInt(process.env.DB_HEALTHCHECK_TIMEOUT_MS || '5000', 10);
let isPoolClosed = false;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20, // Increased to support 8+ concurrent users
  queueLimit: 0,
  connectTimeout: DEFAULT_DB_CONNECT_TIMEOUT_MS,
  enableKeepAlive: true,
});

export function getConnection() {
  if (isPoolClosed) {
    const error = new Error('Database pool is closed');
    error.code = 'POOL_CLOSED';
    throw error;
  }

  return pool.getConnection();
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const error = new Error(timeoutMessage);
          error.code = 'DB_HEALTH_TIMEOUT';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Retry logic for database queries
async function queryWithRetry(sql, values = [], retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await getConnection();
      try {
        const [results] = await connection.execute(sql, values);

        return results;
      } finally {
        connection.release();
      }
    } catch (error) {
      if (i === retries - 1) {
        throw error; // Throw on last attempt
      }
      await new Promise(resolve => { setTimeout(resolve, delay); });
    }
  }
}

export function query(sql, values = []) {
  return queryWithRetry(sql, values, 3, 1000);
}

export async function getDatabaseHealth(timeoutMs = DEFAULT_DB_HEALTHCHECK_TIMEOUT_MS) {
  const startedAt = Date.now();
  let connection;

  try {
    connection = await withTimeout(
      getConnection(),
      timeoutMs,
      `Timed out waiting for a database connection after ${timeoutMs}ms`
    );
    await withTimeout(
      connection.query('SELECT 1 AS ok'),
      timeoutMs,
      `Timed out waiting for the database health check after ${timeoutMs}ms`
    );

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: {
        code: error.code || null,
        message: error.message || 'Database health check failed',
      },
    };
  } finally {
    connection?.release();
  }
}

export async function closePool() {
  if (isPoolClosed) {
    return;
  }

  isPoolClosed = true;

  try {
    await pool.end();
  } catch (error) {
    isPoolClosed = false;
    throw error;
  }
}

export default pool;
