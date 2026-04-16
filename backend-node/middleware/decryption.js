import { decryptData } from '../utils/encryption.js';

const tryParseJson = value => {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

/**
 * Middleware to decrypt encrypted request bodies
 * Checks for is_encrypted flag and decrypts the data
 * Falls back to original body if decryption fails
 */
export const decryptionMiddleware = (req, res, next) => {
  const encryptedData = req.body?.encrypted_data;

  if (req.body?.is_encrypted && encryptedData) {
    try {
      req.body = JSON.parse(decryptData(encryptedData));
    } catch {
      const fallbackBody = tryParseJson(encryptedData);

      if (fallbackBody) {
        req.body = fallbackBody;
      }
    }
  }

  next();
};

export default decryptionMiddleware;
