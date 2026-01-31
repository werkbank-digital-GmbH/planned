import { beforeEach, describe, expect, it } from 'vitest';

import { EncryptionService } from '../EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    // 32 bytes key für AES-256
    const testKey = 'test-encryption-key-32-bytes-xx';
    service = new EncryptionService(testKey);
  });

  describe('encrypt', () => {
    it('should encrypt plaintext to base64 string', () => {
      const plaintext = 'secret-api-token';

      const encrypted = service.encrypt(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=:]+$/);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'same-secret';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');

      expect(encrypted).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hëllö Wörld 🔐';

      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toContain('🔐');
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeTruthy();
    });
  });

  describe('decrypt', () => {
    it('should decrypt to original plaintext', () => {
      const plaintext = 'secret-api-token';
      const encrypted = service.encrypt(plaintext);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hëllö Wörld 🔐';
      const encrypted = service.encrypt(plaintext);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);

      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling', () => {
    it('should throw on invalid ciphertext', () => {
      expect(() => service.decrypt('invalid-base64')).toThrow();
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw on ciphertext encrypted with different key', () => {
      const otherService = new EncryptionService('other-key-32-bytes-long-xxxxxxx');
      const encrypted = otherService.encrypt('secret');

      expect(() => service.decrypt(encrypted)).toThrow();
    });
  });

  describe('key validation', () => {
    it('should accept 32 character key', () => {
      const key32 = 'x'.repeat(32);
      expect(() => new EncryptionService(key32)).not.toThrow();
    });

    it('should hash shorter keys to proper length', () => {
      const shortKey = 'short';
      const service = new EncryptionService(shortKey);

      const encrypted = service.encrypt('test');
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe('test');
    });
  });
});
