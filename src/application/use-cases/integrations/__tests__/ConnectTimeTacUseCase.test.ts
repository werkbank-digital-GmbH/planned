import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ValidationError } from '@/domain/errors';

import type { IIntegrationCredentialsRepository } from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';

import { ConnectTimeTacUseCase } from '../ConnectTimeTacUseCase';

describe('ConnectTimeTacUseCase', () => {
  // Mocks
  const mockTimeTacService = {
    validateApiKey: vi.fn(),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    getAbsences: vi.fn(),
    getTimeEntries: vi.fn(),
    mapAbsenceType: vi.fn(),
  };

  const mockCredentialsRepo = {
    findByTenantId: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockEncryptionService = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  let useCase: ConnectTimeTacUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    useCase = new ConnectTimeTacUseCase(
      mockTimeTacService as unknown as ITimeTacService,
      mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
      mockEncryptionService as unknown as IEncryptionService
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should connect with valid API key', async () => {
      mockTimeTacService.validateApiKey.mockResolvedValue(true);
      mockTimeTacService.getAccount.mockResolvedValue({
        id: 12345,
        name: 'Test Company GmbH',
      });
      mockEncryptionService.encrypt.mockReturnValue('encrypted-api-key');
      mockCredentialsRepo.upsert.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123', 'valid-api-key');

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('Test Company GmbH');
      expect(mockTimeTacService.validateApiKey).toHaveBeenCalledWith('valid-api-key');
      expect(mockTimeTacService.getAccount).toHaveBeenCalledWith('valid-api-key');
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('valid-api-key');
      expect(mockCredentialsRepo.upsert).toHaveBeenCalledWith('tenant-123', {
        timetacApiToken: 'encrypted-api-key',
        timetacAccountId: '12345',
      });
    });

    it('should store account ID as string', async () => {
      mockTimeTacService.validateApiKey.mockResolvedValue(true);
      mockTimeTacService.getAccount.mockResolvedValue({
        id: 99999,
        name: 'Another Company',
      });
      mockEncryptionService.encrypt.mockReturnValue('encrypted-key');
      mockCredentialsRepo.upsert.mockResolvedValue(undefined);

      await useCase.execute('tenant-456', 'api-key');

      expect(mockCredentialsRepo.upsert).toHaveBeenCalledWith(
        'tenant-456',
        expect.objectContaining({
          timetacAccountId: '99999',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION ERRORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Validation Errors', () => {
    it('should throw ValidationError on invalid API key', async () => {
      mockTimeTacService.validateApiKey.mockResolvedValue(false);

      await expect(useCase.execute('tenant-123', 'invalid-api-key')).rejects.toThrow(
        ValidationError
      );
      await expect(useCase.execute('tenant-123', 'invalid-api-key')).rejects.toThrow(
        'Ungültiger API-Key'
      );

      expect(mockTimeTacService.getAccount).not.toHaveBeenCalled();
      expect(mockCredentialsRepo.upsert).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL SERVICE ERRORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('External Service Errors', () => {
    it('should propagate error when validateApiKey fails', async () => {
      mockTimeTacService.validateApiKey.mockRejectedValue(
        new Error('TimeTac API nicht erreichbar')
      );

      await expect(useCase.execute('tenant-123', 'api-key')).rejects.toThrow(
        'TimeTac API nicht erreichbar'
      );

      expect(mockCredentialsRepo.upsert).not.toHaveBeenCalled();
    });

    it('should propagate error when getAccount fails', async () => {
      mockTimeTacService.validateApiKey.mockResolvedValue(true);
      mockTimeTacService.getAccount.mockRejectedValue(
        new Error('Account konnte nicht geladen werden')
      );

      await expect(useCase.execute('tenant-123', 'api-key')).rejects.toThrow(
        'Account konnte nicht geladen werden'
      );

      expect(mockCredentialsRepo.upsert).not.toHaveBeenCalled();
    });
  });
});
