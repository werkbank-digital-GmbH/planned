/**
 * Interface für Verschlüsselungs-Service.
 *
 * Verwendet für sichere Speicherung von API-Tokens und Secrets.
 */
export interface IEncryptionService {
  /**
   * Verschlüsselt einen Klartext-String.
   *
   * @param plaintext - Der zu verschlüsselnde Text
   * @returns Verschlüsselter Text (Base64 encoded)
   */
  encrypt(plaintext: string): string;

  /**
   * Entschlüsselt einen verschlüsselten String.
   *
   * @param ciphertext - Der verschlüsselte Text (Base64 encoded)
   * @returns Entschlüsselter Klartext
   * @throws Error wenn Entschlüsselung fehlschlägt
   */
  decrypt(ciphertext: string): string;
}
