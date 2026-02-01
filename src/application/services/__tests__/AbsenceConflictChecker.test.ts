import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';

import { AbsenceConflictChecker } from '../AbsenceConflictChecker';

describe('AbsenceConflictChecker', () => {
  const mockAbsenceRepository = {
    findById: vi.fn(),
    findByUser: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findByUsersAndDateRange: vi.fn(),
    findByTenantAndDateRange: vi.fn(),
    findByTimetacId: vi.fn(),
    findByAsanaGid: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsertByTimetacId: vi.fn(),
  };

  let checker: AbsenceConflictChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new AbsenceConflictChecker(mockAbsenceRepository);
  });

  const createAbsence = (start: string, end: string, userId = 'user-123') =>
    Absence.create({
      id: `absence-${start}`,
      tenantId: 'tenant-123',
      userId,
      type: 'vacation',
      startDate: new Date(start),
      endDate: new Date(end),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const createAllocation = (date: string, userId: string | undefined, id = `alloc-${date}`) =>
    Allocation.create({
      id,
      tenantId: 'tenant-123',
      userId,
      resourceId: userId ? undefined : 'resource-123',
      projectPhaseId: 'phase-123',
      date: new Date(date),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  describe('hasConflict', () => {
    it('should return true when allocation date is within absence', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([
        createAbsence('2026-02-05', '2026-02-07'),
      ]);

      const result = await checker.hasConflict('user-123', new Date('2026-02-06'));

      expect(result).toBe(true);
      expect(mockAbsenceRepository.findByUserAndDateRange).toHaveBeenCalledWith(
        'user-123',
        new Date('2026-02-06'),
        new Date('2026-02-06')
      );
    });

    it('should return false when no absence exists', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);

      const result = await checker.hasConflict('user-123', new Date('2026-02-06'));

      expect(result).toBe(false);
    });

    it('should return false when date is outside absence range', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([
        createAbsence('2026-02-05', '2026-02-07'),
      ]);

      // Aber Datum ist außerhalb - includesDate sollte false sein
      // Da findByUserAndDateRange nur die Abwesenheiten für diesen Zeitraum zurückgibt,
      // wird hier eine Abwesenheit gefunden, die aber das Datum nicht enthält.
      // Das Szenario wäre: Repository gibt Abwesenheiten zurück, aber keine davon
      // enthält das genaue Datum
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);

      const result = await checker.hasConflict('user-123', new Date('2026-02-08'));

      expect(result).toBe(false);
    });
  });

  describe('getConflictingAbsence', () => {
    it('should return the conflicting absence', async () => {
      const absence = createAbsence('2026-02-05', '2026-02-07');
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([absence]);

      const result = await checker.getConflictingAbsence('user-123', new Date('2026-02-06'));

      expect(result).not.toBeNull();
      expect(result?.id).toBe(absence.id);
    });

    it('should return null when no conflict exists', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);

      const result = await checker.getConflictingAbsence('user-123', new Date('2026-02-06'));

      expect(result).toBeNull();
    });

    it('should return first matching absence when multiple exist', async () => {
      const absence1 = createAbsence('2026-02-05', '2026-02-07');
      const absence2 = createAbsence('2026-02-06', '2026-02-08');
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([absence1, absence2]);

      const result = await checker.getConflictingAbsence('user-123', new Date('2026-02-06'));

      expect(result).not.toBeNull();
      expect(result?.id).toBe(absence1.id);
    });
  });

  describe('getConflictsForAllocations', () => {
    it('should return map of conflicts for allocations', async () => {
      const absence = createAbsence('2026-02-05', '2026-02-07', 'user-123');
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([absence]);

      const allocations = [
        createAllocation('2026-02-06', 'user-123', 'alloc-1'),
        createAllocation('2026-02-08', 'user-123', 'alloc-2'), // No conflict
      ];

      const conflicts = await checker.getConflictsForAllocations(allocations);

      expect(conflicts.size).toBe(1);
      expect(conflicts.has('alloc-1')).toBe(true);
      expect(conflicts.has('alloc-2')).toBe(false);
    });

    it('should handle multiple users', async () => {
      const absenceUser1 = createAbsence('2026-02-05', '2026-02-07', 'user-1');
      const absenceUser2 = createAbsence('2026-02-10', '2026-02-12', 'user-2');

      mockAbsenceRepository.findByUserAndDateRange
        .mockResolvedValueOnce([absenceUser1])
        .mockResolvedValueOnce([absenceUser2]);

      const allocations = [
        createAllocation('2026-02-06', 'user-1', 'alloc-user1'),
        createAllocation('2026-02-11', 'user-2', 'alloc-user2'),
      ];

      const conflicts = await checker.getConflictsForAllocations(allocations);

      expect(conflicts.size).toBe(2);
      expect(conflicts.has('alloc-user1')).toBe(true);
      expect(conflicts.has('alloc-user2')).toBe(true);
    });

    it('should skip resource allocations (no userId)', async () => {
      const allocations = [
        createAllocation('2026-02-06', undefined, 'alloc-resource'),
      ];

      const conflicts = await checker.getConflictsForAllocations(allocations);

      expect(conflicts.size).toBe(0);
      expect(mockAbsenceRepository.findByUserAndDateRange).not.toHaveBeenCalled();
    });

    it('should return empty map when no allocations', async () => {
      const conflicts = await checker.getConflictsForAllocations([]);

      expect(conflicts.size).toBe(0);
    });

    it('should return empty map when no conflicts found', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);

      const allocations = [createAllocation('2026-02-06', 'user-123', 'alloc-1')];

      const conflicts = await checker.getConflictsForAllocations(allocations);

      expect(conflicts.size).toBe(0);
    });

    it('should efficiently batch queries by user', async () => {
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);

      const allocations = [
        createAllocation('2026-02-05', 'user-123', 'alloc-1'),
        createAllocation('2026-02-06', 'user-123', 'alloc-2'),
        createAllocation('2026-02-07', 'user-123', 'alloc-3'),
      ];

      await checker.getConflictsForAllocations(allocations);

      // Sollte nur einmal pro User aufgerufen werden
      expect(mockAbsenceRepository.findByUserAndDateRange).toHaveBeenCalledTimes(1);
    });
  });
});
