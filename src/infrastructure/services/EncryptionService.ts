import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits für GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verschlüsselungs-Service mit AES-256-GCM.
 *
 * Verwendet authentifizierte Verschlüsselung für:
 * - Vertraulichkeit (Verschlüsselung)
 * - Integrität (Authentication Tag)
 *
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 */
export class EncryptionService implements IEncryptionService {
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    // Key auf 32 Bytes hashen (SHA-256)
    this.key = createHash('sha256').update(encryptionKey).digest();
  }

  encrypt(plaintext: string): string {
    // Zufälliger IV für jede Verschlüsselung
    const iv = randomBytes(IV_LENGTH);

    // Cipher erstellen
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    // Verschlüsseln
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Auth Tag extrahieren
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (alle Base64)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    try {
      // Format parsen
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        throw new Error('Ungültiges Verschlüsselungsformat');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encrypted = Buffer.from(parts[2], 'base64');

      // Validierung
      if (iv.length !== IV_LENGTH) {
        throw new Error('Ungültige IV-Länge');
      }
      if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Ungültige AuthTag-Länge');
      }

      // Decipher erstellen
      const decipher = createDecipheriv(ALGORITHM, this.key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      // Entschlüsseln
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Ungültig')) {
        throw error;
      }
      throw new Error('Entschlüsselung fehlgeschlagen');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Erstellt EncryptionService mit Environment-Key.
 */
export function createEncryptionService(): EncryptionService {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable ist nicht gesetzt');
  }
  return new EncryptionService(key);
}
