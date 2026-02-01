import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TimeEntry } from '@/domain/entities/TimeEntry';

import type {
  IIntegrationCredentialsRepository,
  IIntegrationMappingRepository,
  ISyncLogRepository,
  ITimeEntryRepository,
  IUserRepository,
} from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';

import { SyncTimeTacTimeEntriesUseCase } from '../SyncTimeTacTimeEntriesUseCase';

describe('SyncTimeTacTimeEntriesUseCase', () => {
  // Mocks
  const mockTimeTacService = {
    validateApiKey: vi.fn(),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    getAbsences: vi.fn(),
    getTimeEntries: vi.fn(),
    mapAbsenceType: vi.fn(),
  };

  const mockTimeEntryRepo = {
    findById: vi.fn(),
    findByTimeTacId: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    upsertByTimeTacId: vi.fn(),
    delete: vi.fn(),
  };

  const mockUserRepo = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByAuthId: vi.fn(),
    findByAuthIdWithTenant: vi.fn(),
    findByEmailAndTenant: vi.fn(),
    findAllByTenant: vi.fn(),
    findActiveByTenant: vi.fn(),
    findByTenantWithTimetacId: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateTimetacId: vi.fn(),
    delete: vi.fn(),
  };

  const mockCredentialsRepo = {
    findByTenantId: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };

  const mockSyncLogRepo = {
    create: vi.fn(),
    update: vi.fn(),
    findByTenantAndService: vi.fn(),
    findLatestByTenant: vi.fn(),
  };

  const mockEncryptionService = {
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  };

  const mockMappingRepo = {
    findByTenantAndType: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  };

  let useCase: SyncTimeTacTimeEntriesUseCase;

  // Test fixtures
  const createTestCredentials = (overrides = {}) => ({
    timetacApiToken: 'encrypted-api-token',
    timetacAccountId: '12345',
    ...overrides,
  });

  const createTestUser = (overrides = {}) => ({
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'max@example.com',
    fullName: 'Max Mustermann',
    timetacId: '999',
    ...overrides,
  });

  const createTimeTacTimeEntry = (overrides = {}) => ({
    id: 67890,
    user_id: 999,
    project_id: 100,
    date: '2026-02-01',
    duration_hours: 8.0,
    note: 'Arbeiten am Projekt',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockSyncLogRepo.create.mockResolvedValue({ id: 'sync-log-1' });
    mockSyncLogRepo.update.mockResolvedValue(undefined);
    mockEncryptionService.decrypt.mockImplementation((val) => `decrypted-${val}`);
    mockMappingRepo.findByTenantAndType.mockResolvedValue([]);

    useCase = new SyncTimeTacTimeEntriesUseCase(
      mockTimeTacService as unknown as ITimeTacService,
      mockTimeEntryRepo as unknown as ITimeEntryRepository,
      mockUserRepo as unknown as IUserRepository,
      mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
      mockSyncLogRepo as unknown as ISyncLogRepository,
      mockEncryptionService as unknown as IEncryptionService,
      mockMappingRepo as unknown as IIntegrationMappingRepository
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should sync new time entry from TimeTac', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([createTimeTacTimeEntry()]);
      mockTimeEntryRepo.findByTimeTacId.mockResolvedValue(null);
      mockTimeEntryRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockTimeEntryRepo.save).toHaveBeenCalled();
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'success',
        result: expect.objectContaining({ created: 1 }),
        completedAt: expect.any(Date),
      });
    });

    it('should update existing time entry from TimeTac', async () => {
      const existingEntry = TimeEntry.create({
        id: 'entry-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        date: new Date('2026-02-01'),
        hours: 6.0, // Original
        timetacId: '67890',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([
        createTimeTacTimeEntry({ duration_hours: 8.0 }), // Updated to 8h
      ]);
      mockTimeEntryRepo.findByTimeTacId.mockResolvedValue(existingEntry);
      mockTimeEntryRepo.upsertByTimeTacId.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockTimeEntryRepo.upsertByTimeTacId).toHaveBeenCalled();
    });

    it('should skip entries for unmapped users', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([
        createTimeTacTimeEntry({ user_id: 888 }), // Unknown user
      ]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should map project ID to phase ID when mapping exists', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([
        createTimeTacTimeEntry({ project_id: 100 }),
      ]);
      mockTimeEntryRepo.findByTimeTacId.mockResolvedValue(null);
      mockTimeEntryRepo.save.mockResolvedValue(undefined);
      mockMappingRepo.findByTenantAndType.mockResolvedValue([
        { externalId: '100', internalId: 'phase-abc' },
      ]);

      await useCase.execute('tenant-123');

      expect(mockTimeEntryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPhaseId: 'phase-abc',
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NO TIMETAC CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('No TimeTac Connection', () => {
    it('should fail when no credentials', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(null);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('TimeTac ist nicht verbunden');
    });

    it('should fail when no API token', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(
        createTestCredentials({ timetacApiToken: null })
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('TimeTac ist nicht verbunden');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NO MAPPED USERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('No Mapped Users', () => {
    it('should succeed with warning when no users mapped', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.errors).toContain('Keine User mit TimeTac-Zuordnung gefunden');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL SERVICE ERRORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('External Service Errors', () => {
    it('should handle TimeTac API errors', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockRejectedValue(
        new Error('TimeTac API nicht erreichbar')
      );

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('TimeTac API nicht erreichbar');
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'failed',
        errorMessage: 'TimeTac API nicht erreichbar',
        completedAt: expect.any(Date),
      });
    });

    it('should continue sync when single entry fails', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([
        createTimeTacTimeEntry({ id: 1 }),
        createTimeTacTimeEntry({ id: 2 }),
      ]);
      mockTimeEntryRepo.findByTimeTacId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockTimeEntryRepo.save
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.errors).toContain('TimeEntry 2: DB error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE RANGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Date Range', () => {
    it('should use custom date range when provided', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([]);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      await useCase.execute('tenant-123', { start: startDate, end: endDate });

      expect(mockTimeTacService.getTimeEntries).toHaveBeenCalledWith(
        expect.any(String),
        startDate,
        endDate
      );
    });

    it('should use default date range (last 7 days) when not provided', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([]);

      await useCase.execute('tenant-123');

      expect(mockTimeTacService.getTimeEntries).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date), // Start: ~7 days ago
        expect.any(Date) // End: now
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WITHOUT MAPPING REPOSITORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Without Mapping Repository', () => {
    it('should work without mapping repository', async () => {
      // Create use case without mapping repository
      const useCaseWithoutMapping = new SyncTimeTacTimeEntriesUseCase(
        mockTimeTacService as unknown as ITimeTacService,
        mockTimeEntryRepo as unknown as ITimeEntryRepository,
        mockUserRepo as unknown as IUserRepository,
        mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
        mockSyncLogRepo as unknown as ISyncLogRepository,
        mockEncryptionService as unknown as IEncryptionService,
        undefined // No mapping repository
      );

      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getTimeEntries.mockResolvedValue([createTimeTacTimeEntry()]);
      mockTimeEntryRepo.findByTimeTacId.mockResolvedValue(null);
      mockTimeEntryRepo.save.mockResolvedValue(undefined);

      const result = await useCaseWithoutMapping.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(mockTimeEntryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPhaseId: undefined, // No mapping
        })
      );
    });
  });
});
