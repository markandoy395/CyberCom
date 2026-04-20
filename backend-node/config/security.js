const INSECURE_SECRET_VALUES = new Set([
  '',
  'secret-key',
  'your-secret-key-change-in-production',
  'your-super-secret-jwt-key-minimum-32-characters-change-this',
  'your_jwt_secret_key_here_change_this_in_production',
  'change-me',
  'changeme',
]);

const normalizeEnvValue = value => String(value || '').trim();

const assertStrongSecret = (name, options = {}) => {
  const {
    minLength = 32,
  } = options;
  const value = normalizeEnvValue(process.env[name]);

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  if (INSECURE_SECRET_VALUES.has(value.toLowerCase())) {
    throw new Error(`${name} uses an insecure placeholder value. Configure a strong secret before starting the server.`);
  }

  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters long.`);
  }

  return value;
};

const isFeatureEnabled = name => /^(1|true|yes|on)$/i.test(
  normalizeEnvValue(process.env[name])
);

const isLoopbackAddress = address => {
  const normalizedAddress = normalizeEnvValue(address).toLowerCase();

  if (!normalizedAddress) {
    return false;
  }

  if (
    normalizedAddress === '127.0.0.1'
    || normalizedAddress === '::1'
    || normalizedAddress === '::ffff:127.0.0.1'
  ) {
    return true;
  }

  if (normalizedAddress.startsWith('::ffff:')) {
    return isLoopbackAddress(normalizedAddress.slice(7));
  }

  return false;
};

const JWT_SECRET = assertStrongSecret('JWT_SECRET');

export {
  JWT_SECRET,
  assertStrongSecret,
  isFeatureEnabled,
  isLoopbackAddress,
};
