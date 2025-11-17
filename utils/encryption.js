const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Ensure the key is the correct length (32 bytes for AES-256)
const getKey = () => {
  if (ENCRYPTION_KEY.length === 64) {
    // Key is already a 32-byte hex string
    return Buffer.from(ENCRYPTION_KEY, 'hex');
  } else if (ENCRYPTION_KEY.length === 32) {
    // Key is a 32-byte string
    return Buffer.from(ENCRYPTION_KEY);
  } else {
    // Hash the key to get exactly 32 bytes
    return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  }
};

/**
 * Encrypts a value using AES-256-CBC
 * @param {string} value - The value to encrypt
 * @returns {object} - Object containing encrypted value and IV
 */
function encrypt(value) {
  if (!value) {
    throw new Error('Value to encrypt cannot be empty');
  }

  const key = getKey();
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypts a value using AES-256-CBC
 * @param {string} encryptedValue - The encrypted value
 * @param {string} ivHex - The initialization vector in hex format
 * @returns {string} - The decrypted value
 */
function decrypt(encryptedValue, ivHex) {
  if (!encryptedValue || !ivHex) {
    throw new Error('Encrypted value and IV are required for decryption');
  }

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a random encryption key (32 bytes in hex format)
 * @returns {string} - Random 32-byte key in hex format
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateKey
};
