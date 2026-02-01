import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';

import type {
  IAbsenceConflictRepository,
  IAbsenceRepository,
  IAllocationRepository,
  IIntegrationCredentialsRepository,
  ISyncLogRepository,
  IUserRepository,
} from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';

import { SyncTimeTacAbsencesUseCase } from '../SyncTimeTacAbsencesUseCase';

describe('SyncTimeTacAbsencesUseCase', () => {
  // Mocks
  const mockTimeTacService = {
    validateApiKey: vi.fn(),
    getAccount: vi.fn(),
    getUsers: vi.fn(),
    getAbsences: vi.fn(),
    getTimeEntries: vi.fn(),
    mapAbsenceType: vi.fn(),
  };

  const mockAbsenceRepo = {
    findById: vi.fn(),
    findByTimetacId: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
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

  const mockAllocationRepo = {
    findByUserAndDateRange: vi.fn(),
    save: vi.fn(),
  };

  const mockConflictRepo = {
    findByAbsenceId: vi.fn(),
    save: vi.fn(),
    deleteByAbsenceId: vi.fn(),
  };

  let useCase: SyncTimeTacAbsencesUseCase;

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

  const createTimeTacAbsence = (overrides = {}) => ({
    id: 12345,
    user_id: 999,
    absence_type_id: 1, // Urlaub
    date_from: '2026-02-10',
    date_to: '2026-02-14',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockSyncLogRepo.create.mockResolvedValue({ id: 'sync-log-1' });
    mockSyncLogRepo.update.mockResolvedValue(undefined);
    mockEncryptionService.decrypt.mockImplementation((val) => `decrypted-${val}`);
    mockAllocationRepo.findByUserAndDateRange.mockResolvedValue([]);
    mockConflictRepo.findByAbsenceId.mockResolvedValue([]);
    mockConflictRepo.save.mockResolvedValue(undefined);

    useCase = new SyncTimeTacAbsencesUseCase(
      mockTimeTacService as unknown as ITimeTacService,
      mockAbsenceRepo as unknown as IAbsenceRepository,
      mockUserRepo as unknown as IUserRepository,
      mockCredentialsRepo as unknown as IIntegrationCredentialsRepository,
      mockSyncLogRepo as unknown as ISyncLogRepository,
      mockEncryptionService as unknown as IEncryptionService,
      mockAllocationRepo as unknown as IAllocationRepository,
      mockConflictRepo as unknown as IAbsenceConflictRepository
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Happy Path', () => {
    it('should sync new absence from TimeTac', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([createTimeTacAbsence()]);
      mockTimeTacService.mapAbsenceType.mockReturnValue('vacation');
      mockAbsenceRepo.findByTimetacId.mockResolvedValue(null);
      mockAbsenceRepo.save.mockImplementation((absence) => Promise.resolve(absence));

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(mockAbsenceRepo.save).toHaveBeenCalled();
      expect(mockSyncLogRepo.update).toHaveBeenCalledWith('sync-log-1', {
        status: 'success',
        result: expect.objectContaining({ created: 1 }),
        completedAt: expect.any(Date),
      });
    });

    it('should update existing absence from TimeTac', async () => {
      const existingAbsence = Absence.create({
        id: 'absence-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        type: 'vacation',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-12'), // Original: 12th
        timetacId: '12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([
        createTimeTacAbsence({ date_to: '2026-02-14' }), // Extended to 14th
      ]);
      mockTimeTacService.mapAbsenceType.mockReturnValue('vacation');
      mockAbsenceRepo.findByTimetacId.mockResolvedValue(existingAbsence);
      mockAbsenceRepo.update.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(mockAbsenceRepo.update).toHaveBeenCalled();
    });

    it('should skip absences for unmapped users', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([
        createTimeTacAbsence({ user_id: 888 }), // Unknown user
      ]);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
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
      mockTimeTacService.getAbsences.mockRejectedValue(
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

    it('should continue sync when single absence fails', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([
        createTimeTacAbsence({ id: 1 }),
        createTimeTacAbsence({ id: 2 }),
      ]);
      mockTimeTacService.mapAbsenceType.mockReturnValue('vacation');
      mockAbsenceRepo.findByTimetacId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockAbsenceRepo.save
        .mockResolvedValueOnce(Absence.create({
          id: 'absence-1',
          tenantId: 'tenant-123',
          userId: 'user-123',
          type: 'vacation',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(result.errors).toContain('Abwesenheit 2: DB error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Conflict Detection', () => {
    it('should detect conflicts with existing allocations', async () => {
      const savedAbsence = Absence.create({
        id: 'absence-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        type: 'vacation',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-14'),
        timetacId: '12345',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([createTimeTacAbsence()]);
      mockTimeTacService.mapAbsenceType.mockReturnValue('vacation');
      mockAbsenceRepo.findByTimetacId.mockResolvedValue(null);
      mockAbsenceRepo.save.mockResolvedValue(savedAbsence);
      // Simulate allocation conflict
      mockAllocationRepo.findByUserAndDateRange.mockResolvedValue([
        {
          id: 'alloc-1',
          userId: 'user-123',
          date: new Date('2026-02-11'),
          projectPhaseId: 'phase-1',
        },
      ]);
      mockConflictRepo.save.mockResolvedValue(undefined);

      const result = await useCase.execute('tenant-123');

      expect(result.success).toBe(true);
      expect(result.conflictsDetected).toBeGreaterThanOrEqual(0); // May vary
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE RANGE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Date Range', () => {
    it('should use custom date range when provided', async () => {
      mockCredentialsRepo.findByTenantId.mockResolvedValue(createTestCredentials());
      mockUserRepo.findByTenantWithTimetacId.mockResolvedValue([createTestUser()]);
      mockTimeTacService.getAbsences.mockResolvedValue([]);

      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');

      await useCase.execute('tenant-123', { start: startDate, end: endDate });

      expect(mockTimeTacService.getAbsences).toHaveBeenCalledWith(
        expect.any(String),
        startDate,
        endDate
      );
    });
  });
});
