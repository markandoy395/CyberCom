import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const IV_LENGTH = 16;
const logWarning = message => process.emitWarning(message, { code: 'CYBERCOM_ENCRYPTION' });
const logError = (scope, error) => process.stderr.write(`[Encryption] ${scope}: ${error.message}\n`);

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Please configure it in .env file.');
  }

  if (key.length !== 64) {
    logWarning(
      `ENCRYPTION_KEY should be 64 hex characters (32 bytes) for AES-256. Current length: ${key.length}`
    );
  }

  return key;
}

export function encryptData(text) {
  if (!text) { return ''; }

  const key = Buffer.from(getEncryptionKey(), 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Return IV + ciphertext (IV needed for decryption)
  return `${iv.toString('base64')}:${encrypted}`;
}

export function decryptData(encryptedText) {
  try {
    if (!encryptedText) { return ''; }

    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      return encryptedText;
    }

    const [ivPart, ciphertextPart] = parts;
    const iv = Buffer.from(ivPart, 'base64');
    const key = Buffer.from(getEncryptionKey(), 'hex');

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(ciphertextPart, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logError('Decryption error', error);

    return encryptedText;
  }
}

export const encrypt = encryptData;
export const decrypt = decryptData;
