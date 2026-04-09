import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptAccessKey, decryptAccessKey, validateSiigoEncryptionKey } from '../siigo-crypto';

const VALID_KEY = 'a'.repeat(64); // 64-char hex (all 'a' is valid hex)

describe('siigo-crypto', () => {
  beforeEach(() => {
    process.env['SIIGO_ENCRYPTION_KEY'] = VALID_KEY;
  });

  afterEach(() => {
    delete process.env['SIIGO_ENCRYPTION_KEY'];
  });

  describe('encryptAccessKey / decryptAccessKey', () => {
    it('round-trip: encrypt then decrypt returns original plaintext', () => {
      const plaintext = 'my-secret-access-key-12345';
      const encrypted = encryptAccessKey(plaintext);
      expect(decryptAccessKey(encrypted)).toBe(plaintext);
    });

    it('produces enc:v1: prefix', () => {
      const encrypted = encryptAccessKey('test');
      expect(encrypted.startsWith('enc:v1:')).toBe(true);
    });

    it('different IVs produce different ciphertexts for same plaintext', () => {
      const plaintext = 'same-key';
      const enc1 = encryptAccessKey(plaintext);
      const enc2 = encryptAccessKey(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('decryptAccessKey throws on tampered ciphertext (auth tag failure)', () => {
      const encrypted = encryptAccessKey('original');
      // Flip last character to corrupt auth tag
      const tampered = encrypted.slice(0, -1) + (encrypted.endsWith('A') ? 'B' : 'A');
      expect(() => decryptAccessKey(tampered)).toThrow();
    });

    it('decryptAccessKey throws on missing enc:v1: prefix', () => {
      expect(() => decryptAccessKey('plain-text-no-prefix')).toThrow(/prefix/i);
    });
  });

  describe('validateSiigoEncryptionKey', () => {
    it('passes when env var is a valid 64-char hex string', () => {
      expect(() => validateSiigoEncryptionKey()).not.toThrow();
    });

    it('throws when env var is absent', () => {
      delete process.env['SIIGO_ENCRYPTION_KEY'];
      expect(() => validateSiigoEncryptionKey()).toThrow();
    });

    it('throws when env var is not 64-char hex', () => {
      process.env['SIIGO_ENCRYPTION_KEY'] = 'too-short';
      expect(() => validateSiigoEncryptionKey()).toThrow();
    });

    it('throws when env var has non-hex characters', () => {
      process.env['SIIGO_ENCRYPTION_KEY'] = 'z'.repeat(64); // 'z' is not hex
      expect(() => validateSiigoEncryptionKey()).toThrow();
    });
  });
});
