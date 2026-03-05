import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // bytes — recomendado para GCM
const TAG_LENGTH = 16; // bytes — auth tag GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const hex = process.env['SIIGO_ENCRYPTION_KEY'];
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      'SIIGO_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

export function encryptAccessKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, ciphertext, authTag]);
  return PREFIX + combined.toString('base64url');
}

export function decryptAccessKey(encrypted: string): string {
  if (!encrypted.startsWith(PREFIX)) {
    throw new Error('Invalid encrypted access key format — expected "enc:v1:" prefix');
  }
  const key = getEncryptionKey();
  const combined = Buffer.from(encrypted.slice(PREFIX.length), 'base64url');

  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted access key — payload too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Validates SIIGO_ENCRYPTION_KEY at startup.
 * Call this at the top of config route handlers.
 */
export function validateSiigoEncryptionKey(): void {
  // getEncryptionKey throws if invalid — we just let it propagate
  getEncryptionKey();
}
