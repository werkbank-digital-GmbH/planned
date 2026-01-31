import { ValidationError } from '@/domain/errors';

import type { IIntegrationCredentialsRepository } from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConnectTimeTacResult {
  success: boolean;
  accountName?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Verbindet TimeTac mit API-Key.
 *
 * Prozess:
 * 1. API-Key validieren
 * 2. Account-Info laden
 * 3. Key verschlüsselt speichern
 */
export class ConnectTimeTacUseCase {
  constructor(
    private readonly timetacService: ITimeTacService,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string, apiKey: string): Promise<ConnectTimeTacResult> {
    // 1. API-Key validieren
    const isValid = await this.timetacService.validateApiKey(apiKey);
    if (!isValid) {
      throw new ValidationError('Ungültiger API-Key');
    }

    // 2. Account-Info laden
    const account = await this.timetacService.getAccount(apiKey);

    // 3. Verschlüsselt speichern
    const encryptedKey = this.encryptionService.encrypt(apiKey);

    await this.credentialsRepository.upsert(tenantId, {
      timetacApiToken: encryptedKey,
      timetacAccountId: String(account.id),
    });

    return {
      success: true,
      accountName: account.name,
    };
  }
}
