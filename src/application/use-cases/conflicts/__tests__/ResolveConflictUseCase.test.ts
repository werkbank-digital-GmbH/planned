import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Allocation } from '@/domain/entities/Allocation';

import type {
  AbsenceConflictEntity,
  IAbsenceConflictRepository,
} from '@/application/ports/repositories/IAbsenceConflictRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';

import { ResolveConflictUseCase } from '../ResolveConflictUseCase';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

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

const testAllocation = Allocation.create({
  id: 'alloc-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  projectPhaseId: 'phase-1',
  date: new Date('2026-02-04'),
  plannedHours: 8,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ResolveConflictUseCase', () => {
  let useCase: ResolveConflictUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ResolveConflictUseCase(mockConflictRepository, mockAllocationRepository);
  });

  describe('resolution: ignored', () => {
    it('should mark conflict as ignored without changing allocation', async () => {
      vi.mocked(mockConflictRepository.findById).mockResolvedValue(testConflict);
      vi.mocked(mockConflictRepository.resolve).mockResolvedValue({
        ...testConflict,
        resolvedAt: new Date(),
        resolvedBy: 'resolver-1',
        resolution: 'ignored',
      });

      const result = await useCase.execute({
        conflictId: 'conflict-1',
        resolution: 'ignored',
        resolvedBy: 'resolver-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conflict.resolution).toBe('ignored');
      }
      expect(mockAllocationRepository.delete).not.toHaveBeenCalled();
      expect(mockAllocationRepository.moveToDate).not.toHaveBeenCalled();
    });
  });

  describe('resolution: deleted', () => {
    it('should delete the allocation and resolve conflict', async () => {
      vi.mocked(mockConflictRepository.findById).mockResolvedValue(testConflict);
      vi.mocked(mockAllocationRepository.delete).mockResolvedValue();
      vi.mocked(mockConflictRepository.resolve).mockResolvedValue({
        ...testConflict,
        resolvedAt: new Date(),
        resolvedBy: 'resolver-1',
        resolution: 'deleted',
      });

      const result = await useCase.execute({
        conflictId: 'conflict-1',
        resolution: 'deleted',
        resolvedBy: 'resolver-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conflict.resolution).toBe('deleted');
      }
      expect(mockAllocationRepository.delete).toHaveBeenCalledWith('alloc-1');
    });
  });

  describe('resolution: moved', () => {
    it('should move allocation to new date and resolve conflict', async () => {
      const newDate = new Date('2026-02-10');
      const movedAllocation = Allocation.create({
        ...testAllocation,
        date: newDate,
      });

      vi.mocked(mockConflictRepository.findById).mockResolvedValue(testConflict);
      vi.mocked(mockAllocationRepository.moveToDate).mockResolvedValue(movedAllocation);
      vi.mocked(mockConflictRepository.resolve).mockResolvedValue({
        ...testConflict,
        resolvedAt: new Date(),
        resolvedBy: 'resolver-1',
        resolution: 'moved',
      });

      const result = await useCase.execute({
        conflictId: 'conflict-1',
        resolution: 'moved',
        resolvedBy: 'resolver-1',
        newDate,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.conflict.resolution).toBe('moved');
      }
      expect(mockAllocationRepository.moveToDate).toHaveBeenCalledWith('alloc-1', newDate);
    });

    it('should fail if newDate is not provided', async () => {
      vi.mocked(mockConflictRepository.findById).mockResolvedValue(testConflict);

      const result = await useCase.execute({
        conflictId: 'conflict-1',
        resolution: 'moved',
        resolvedBy: 'resolver-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NEW_DATE_REQUIRED');
      }
    });
  });

  describe('error handling', () => {
    it('should fail if conflict not found', async () => {
      vi.mocked(mockConflictRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({
        conflictId: 'non-existent',
        resolution: 'ignored',
        resolvedBy: 'resolver-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT_NOT_FOUND');
      }
    });

    it('should fail if conflict already resolved', async () => {
      vi.mocked(mockConflictRepository.findById).mockResolvedValue({
        ...testConflict,
        resolvedAt: new Date(),
        resolution: 'ignored',
      });

      const result = await useCase.execute({
        conflictId: 'conflict-1',
        resolution: 'deleted',
        resolvedBy: 'resolver-1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFLICT_ALREADY_RESOLVED');
      }
    });
  });
});
