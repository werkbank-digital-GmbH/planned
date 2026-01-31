import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';

import type {
  AbsenceConflictEntity,
  CreateConflictInput,
  IAbsenceConflictRepository,
} from '@/application/ports/repositories/IAbsenceConflictRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';

import { AbsenceConflictService } from '../AbsenceConflictService';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockAllocationRepository: IAllocationRepository = {
  findById: vi.fn(),
  findByUserAndDate: vi.fn(),
  findByResourceAndDate: vi.fn(),
  findByPhaseAndDateRange: vi.fn(),
  findByUserAndDateRange: vi.fn(),
  findByTenantAndDateRange: vi.fn(),
  countByUserAndDate: vi.fn(),
  save: vi.fn(),
  saveMany: vi.fn(),
  update: vi.fn(),
  updateManyPlannedHours: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  moveToDate: vi.fn(),
  moveToPhase: vi.fn(),
};

const mockConflictRepository: IAbsenceConflictRepository = {
  findById: vi.fn(),
  findByAllocationAndAbsence: vi.fn(),
  findUnresolvedByTenant: vi.fn(),
  findByAbsenceId: vi.fn(),
  findByAllocationId: vi.fn(),
  countUnresolvedByTenant: vi.fn(),
  save: vi.fn(),
  saveMany: vi.fn(),
  resolve: vi.fn(),
  deleteByAbsenceId: vi.fn(),
  deleteByAllocationId: vi.fn(),
};

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const testAbsence = Absence.create({
  id: 'absence-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  type: 'vacation',
  startDate: new Date('2026-02-02'),
  endDate: new Date('2026-02-06'),
  createdAt: new Date(),
  updatedAt: new Date(),
});

const testAllocation1 = Allocation.create({
  id: 'alloc-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  projectPhaseId: 'phase-1',
  date: new Date('2026-02-04'),
  plannedHours: 8,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const testAllocation2 = Allocation.create({
  id: 'alloc-2',
  tenantId: 'tenant-1',
  userId: 'user-1',
  projectPhaseId: 'phase-2',
  date: new Date('2026-02-05'),
  plannedHours: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const testConflict: AbsenceConflictEntity = {
  id: 'conflict-1',
  tenantId: 'tenant-1',
  allocationId: 'alloc-1',
  absenceId: 'absence-1',
  userId: 'user-1',
  date: new Date('2026-02-04'),
  absenceType: 'vacation',
  createdAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('AbsenceConflictService', () => {
  let service: AbsenceConflictService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AbsenceConflictService(mockAllocationRepository, mockConflictRepository);
  });

  describe('detectAndRecordConflicts', () => {
    it('should detect conflicts when absence overlaps allocations', async () => {
      vi.mocked(mockAllocationRepository.findByUserAndDateRange).mockResolvedValue([
        testAllocation1,
        testAllocation2,
      ]);
      vi.mocked(mockConflictRepository.findByAllocationAndAbsence).mockResolvedValue(null);
      vi.mocked(mockConflictRepository.saveMany).mockImplementation(async (conflicts: CreateConflictInput[]) =>
        conflicts.map((c, i) => ({
          id: `conflict-${i}`,
          ...c,
          createdAt: new Date(),
        }))
      );

      const conflicts = await service.detectAndRecordConflicts(testAbsence);

      expect(conflicts).toHaveLength(2);
      expect(mockAllocationRepository.findByUserAndDateRange).toHaveBeenCalledWith(
        'user-1',
        testAbsence.startDate,
        testAbsence.endDate
      );
      expect(mockConflictRepository.saveMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            allocationId: 'alloc-1',
            absenceId: 'absence-1',
          }),
          expect.objectContaining({
            allocationId: 'alloc-2',
            absenceId: 'absence-1',
          }),
        ])
      );
    });

    it('should not create duplicate conflicts', async () => {
      vi.mocked(mockAllocationRepository.findByUserAndDateRange).mockResolvedValue([
        testAllocation1,
      ]);
      // Return existing conflict so duplicate is not created
      vi.mocked(mockConflictRepository.findByAllocationAndAbsence).mockResolvedValue(testConflict);

      const conflicts = await service.detectAndRecordConflicts(testAbsence);

      expect(conflicts).toHaveLength(0);
      // saveMany should not be called when there are no new conflicts (early return)
      expect(mockConflictRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should return empty array when no allocations in range', async () => {
      vi.mocked(mockAllocationRepository.findByUserAndDateRange).mockResolvedValue([]);

      const conflicts = await service.detectAndRecordConflicts(testAbsence);

      expect(conflicts).toHaveLength(0);
      expect(mockConflictRepository.saveMany).not.toHaveBeenCalled();
    });
  });

  describe('resolveConflict', () => {
    it('should resolve a conflict', async () => {
      const resolvedConflict: AbsenceConflictEntity = {
        ...testConflict,
        resolvedAt: new Date(),
        resolvedBy: 'resolver-1',
        resolution: 'ignored',
      };

      vi.mocked(mockConflictRepository.resolve).mockResolvedValue(resolvedConflict);

      const result = await service.resolveConflict('conflict-1', 'ignored', 'resolver-1');

      expect(result).toEqual(resolvedConflict);
      expect(mockConflictRepository.resolve).toHaveBeenCalledWith(
        'conflict-1',
        'ignored',
        'resolver-1'
      );
    });
  });

  describe('removeConflictsForAbsence', () => {
    it('should delete all conflicts for an absence', async () => {
      vi.mocked(mockConflictRepository.deleteByAbsenceId).mockResolvedValue();

      await service.removeConflictsForAbsence('absence-1');

      expect(mockConflictRepository.deleteByAbsenceId).toHaveBeenCalledWith('absence-1');
    });
  });

  describe('removeConflictsForAllocation', () => {
    it('should delete all conflicts for an allocation', async () => {
      vi.mocked(mockConflictRepository.deleteByAllocationId).mockResolvedValue();

      await service.removeConflictsForAllocation('alloc-1');

      expect(mockConflictRepository.deleteByAllocationId).toHaveBeenCalledWith('alloc-1');
    });
  });

  describe('updateConflictsForAbsence', () => {
    it('should update conflicts when absence dates change', async () => {
      const oldAbsence = testAbsence;
      const newAbsence = Absence.create({
        ...testAbsence,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-10'),
      });

      vi.mocked(mockConflictRepository.deleteByAbsenceId).mockResolvedValue();
      vi.mocked(mockAllocationRepository.findByUserAndDateRange).mockResolvedValue([
        testAllocation1,
      ]);
      vi.mocked(mockConflictRepository.findByAllocationAndAbsence).mockResolvedValue(null);
      vi.mocked(mockConflictRepository.saveMany).mockImplementation(async (conflicts) =>
        conflicts.map((c, i) => ({
          id: `conflict-${i}`,
          ...c,
          createdAt: new Date(),
        }))
      );

      const conflicts = await service.updateConflictsForAbsence(oldAbsence, newAbsence);

      expect(mockConflictRepository.deleteByAbsenceId).toHaveBeenCalledWith(oldAbsence.id);
      expect(conflicts).toHaveLength(1);
    });

    it('should not recalculate when only type changes', async () => {
      const oldAbsence = testAbsence;
      const newAbsence = Absence.create({
        ...testAbsence,
        type: 'sick',
      });

      const conflicts = await service.updateConflictsForAbsence(oldAbsence, newAbsence);

      expect(mockConflictRepository.deleteByAbsenceId).not.toHaveBeenCalled();
      expect(mockAllocationRepository.findByUserAndDateRange).not.toHaveBeenCalled();
      expect(conflicts).toHaveLength(0);
    });
  });
});
