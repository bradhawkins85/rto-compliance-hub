import crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment or generate a secure default for development
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    // Development fallback - NOT secure for production
    console.warn('⚠️ Using default encryption key - DO NOT use in production');
    return 'dev-encryption-key-change-in-production-use-32-byte-key-minimum';
  }
  
  return key;
}

/**
 * Derive encryption key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data (e.g., OAuth tokens)
 * Returns base64 encoded string with format: salt:iv:encrypted:tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const masterKey = getEncryptionKey();
  
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from master key and salt
  const key = deriveKey(masterKey, salt);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Get authentication tag
  const tag = cipher.getAuthTag();
  
  // Combine salt, iv, encrypted data, and tag
  const result = Buffer.concat([
    salt,
    iv,
    Buffer.from(encrypted, 'base64'),
    tag,
  ]);
  
  return result.toString('base64');
}

/**
 * Decrypt sensitive data
 * Takes base64 encoded string with format: salt:iv:encrypted:tag
 */
export function decrypt(encrypted: string): string {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty string');
  }

  const masterKey = getEncryptionKey();
  
  // Decode from base64
  const buffer = Buffer.from(encrypted, 'base64');
  
  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(buffer.length - TAG_LENGTH);
  const encryptedData = buffer.subarray(SALT_LENGTH + IV_LENGTH, buffer.length - TAG_LENGTH);
  
  // Derive key from master key and salt
  const key = deriveKey(masterKey, salt);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  // Decrypt
  let decrypted = decipher.update(encryptedData.toString('base64'), 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Test encryption/decryption functionality
 */
export function testEncryption(): boolean {
  try {
    const testString = 'test-encryption-string-' + Date.now();
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    return testString === decrypted;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}
