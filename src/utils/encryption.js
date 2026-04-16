import CryptoJS from 'crypto-js';

const DEFAULT_ENCRYPTION_KEY = 'CyberCom_Default_Secret_Key_2026';
const HEX_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const rawEncryptionKey = (
  import.meta.env.VITE_ENCRYPTION_KEY_HEX
  || import.meta.env.VITE_ENCRYPTION_KEY
  || DEFAULT_ENCRYPTION_KEY
).trim();
const FINAL_KEY = HEX_KEY_PATTERN.test(rawEncryptionKey)
  ? CryptoJS.enc.Hex.parse(rawEncryptionKey)
  : CryptoJS.SHA256(rawEncryptionKey);

const parseJsonSafely = value => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const COMPETITION_ACCESS_REVOKED_ERROR_CODE = 'competition_access_revoked';
const isCompetitionDashboardRoute = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (window.location.pathname || '').includes('/competition/dashboard');
};
const getCompetitionSessionToken = () => {
  if (typeof localStorage === 'undefined') {
    return '';
  }

  try {
    const session = JSON.parse(localStorage.getItem('competitionSession') || 'null');

    return session?.sessionToken || '';
  } catch {
    return '';
  }
};
const emitCompetitionAccessRevoked = message => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('competition-access-revoked', {
    detail: {
      message: message || 'Your competition access was revoked.',
    },
  }));
};

/**
 * Encrypt data using AES-256-CBC with random IV
 * Format: "<ivBase64>:<ciphertextBase64>" to match the backend decryptor
 * @param {any} data - Data to encrypt (will be JSON stringified)
 * @returns {string} - IV and ciphertext encoded as base64 segments
 */
export const encryptData = (data) => {
  try {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(jsonString, FINAL_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return `${CryptoJS.enc.Base64.stringify(iv)}:${CryptoJS.enc.Base64.stringify(encrypted.ciphertext)}`;
  } catch {
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES-256-CBC
 * @param {string} encryptedData - Encrypted data to decrypt
 * @returns {any} - Decrypted data (parsed as JSON if possible)
 */
export const decryptData = (encryptedData) => {
  try {
    if (typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
      throw new Error('Unsupported encrypted payload format');
    }

    const [ivPart, ciphertextPart] = encryptedData.split(':');
    const iv = CryptoJS.enc.Base64.parse(ivPart);
    const ciphertext = CryptoJS.enc.Base64.parse(ciphertextPart);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, FINAL_KEY, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return parseJsonSafely(decrypted.toString(CryptoJS.enc.Utf8));
  } catch {
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Wrapper for fetch API calls with automatic encryption
 * Encrypts request body and adds encryption flag
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const encryptedFetch = async (url, options = {}) => {
  const modifiedOptions = { ...options };
  let parsedRequestBody = null;

  // Encrypt body if it exists
  if (modifiedOptions.body && typeof modifiedOptions.body === 'string') {
    try {
      parsedRequestBody = JSON.parse(modifiedOptions.body);
      const encrypted = encryptData(parsedRequestBody);
      modifiedOptions.body = JSON.stringify({
        encrypted_data: encrypted,
        is_encrypted: true,
      });
    } catch {
      // If body is not JSON, encrypt as is
      const encrypted = encryptData(modifiedOptions.body);
      modifiedOptions.body = JSON.stringify({
        encrypted_data: encrypted,
        is_encrypted: true,
      });
    }
  }

  // Set content type
  if (!modifiedOptions.headers) {
    modifiedOptions.headers = {};
  }
  modifiedOptions.headers['Content-Type'] = 'application/json';

  const shouldAttachCompetitionToken = (
    isCompetitionDashboardRoute()
    && url.startsWith('/api/submissions')
    && (
      parsedRequestBody?.team_member_id !== undefined
      || parsedRequestBody?.competition_id !== undefined
    )
  );
  const competitionSessionToken = shouldAttachCompetitionToken
    ? getCompetitionSessionToken()
    : '';

  if (competitionSessionToken) {
    modifiedOptions.headers['x-competition-token'] = competitionSessionToken;
  }

  const response = await fetch(url, modifiedOptions);

  if (!response.ok) {
    try {
      const data = await response.clone().json();

      if (data?.errorCode === COMPETITION_ACCESS_REVOKED_ERROR_CODE) {
        emitCompetitionAccessRevoked(data.error);
      }
    } catch {
      // Ignore response parsing errors and return the original response.
    }
  }

  return response;
};

/**
 * Get encryption key (for debugging)
 * @returns {string}
 */
export const getEncryptionKey = () => {
  return rawEncryptionKey;
};
