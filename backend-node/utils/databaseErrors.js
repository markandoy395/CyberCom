const DATABASE_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ER_CON_COUNT_ERROR',
  'POOL_CLOSED',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
  'DB_HEALTH_TIMEOUT',
]);
const DATABASE_CONFIGURATION_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
]);

const DATABASE_UNAVAILABLE_PATTERNS = [
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /Can't connect to MySQL server/i,
  /Connection lost/i,
  /Pool is closed/i,
  /Too many connections/i,
  /connect ECONNREFUSED/i,
  /getConnection\(\) after pool was closed/i,
];
const DATABASE_CONFIGURATION_PATTERNS = [
  /Access denied for user/i,
  /database access denied/i,
];

export const DATABASE_UNAVAILABLE_MESSAGE = 'Database unavailable. Please try again shortly.';
export const DATABASE_CONFIGURATION_MESSAGE
  = 'Database login failed. Check DB_USER and DB_PASSWORD in backend-node/.env.';

const getErrorDetails = error => {
  if (typeof error === 'string') {
    return { code: '', message: error };
  }

  if (!error || typeof error !== 'object') {
    return { code: '', message: '' };
  }

  return {
    code: String(error.code || '').trim(),
    message: String(error.message || error.error || '').trim(),
  };
};

export const isDatabaseUnavailableError = error => {
  const { code, message } = getErrorDetails(error);

  return DATABASE_UNAVAILABLE_CODES.has(code)
    || DATABASE_UNAVAILABLE_PATTERNS.some(pattern => pattern.test(message));
};

export const isDatabaseConfigurationError = error => {
  const { code, message } = getErrorDetails(error);

  return DATABASE_CONFIGURATION_CODES.has(code)
    || DATABASE_CONFIGURATION_PATTERNS.some(pattern => pattern.test(message));
};

export const getDatabaseClientErrorMessage = error => {
  if (isDatabaseConfigurationError(error)) {
    return DATABASE_CONFIGURATION_MESSAGE;
  }

  if (isDatabaseUnavailableError(error)) {
    return DATABASE_UNAVAILABLE_MESSAGE;
  }

  return null;
};

