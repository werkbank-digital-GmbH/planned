import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';
import { User } from '@/domain/entities/User';
import { NotFoundError, ValidationError } from '@/domain/errors';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { AbsenceConflictChecker } from '@/application/services/AbsenceConflictChecker';

import { MoveAllocationUseCase } from '../MoveAllocationUseCase';

describe('MoveAllocationUseCase', () => {
  // Mock repositories
  const mockAllocationRepo = {
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

  const mockUserRepo = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByAuthId: vi.fn(),
    findByAuthIdWithTenant: vi.fn(),
    findByEmailAndTenant: vi.fn(),
    findAllByTenant: vi.fn(),
    findActiveByTenant: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPhaseRepo = {
    findById: vi.fn(),
    findByAsanaGid: vi.fn(),
    findAllByProject: vi.fn(),
    findActiveByProject: vi.fn(),
    findByBereich: vi.fn(),
    findReadyForHardDelete: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    updateDates: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockAbsenceChecker = {
    hasConflict: vi.fn(),
    getConflictingAbsence: vi.fn(),
    getConflictsForAllocations: vi.fn(),
  };

  let useCase: MoveAllocationUseCase;

  // Test fixtures
  const createTestUser = (overrides = {}) =>
    User.create({
      id: 'user-123',
      authId: 'auth-123',
      tenantId: 'tenant-123',
      email: 'max@example.com',
      fullName: 'Max Mustermann',
      role: 'gewerblich',
      weeklyHours: 40,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createTestAllocation = (overrides = {}) =>
    Allocation.create({
      id: 'alloc-123',
      tenantId: 'tenant-123',
      userId: 'user-123',
      projectPhaseId: 'phase-123',
      date: new Date('2026-02-05'),
      plannedHours: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createTestAbsence = (overrides = {}) =>
    Absence.create({
      id: 'absence-123',
      tenantId: 'tenant-123',
      userId: 'user-123',
      type: 'vacation',
      startDate: new Date('2026-02-10'),
      endDate: new Date('2026-02-12'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  // Default phase fixture
  const createTestPhase = (overrides = {}) => ({
    id: 'phase-123',
    tenantId: 'tenant-123',
    projectId: 'project-123',
    name: 'Elementierung',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockAllocationRepo.findById.mockResolvedValue(createTestAllocation());
    mockUserRepo.findById.mockResolvedValue(createTestUser());
    mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
    mockAllocationRepo.findByUserAndDate.mockResolvedValue([]);
    mockAllocationRepo.countByUserAndDate.mockResolvedValue(0);
    mockAllocationRepo.moveToDate.mockImplementation((_id, date) =>
      Promise.resolve(createTestAllocation({ date }))
    );
    mockAllocationRepo.moveToPhase.mockImplementation((_id, phaseId) =>
      Promise.resolve(createTestAllocation({ projectPhaseId: phaseId }))
    );
    mockAllocationRepo.updateManyPlannedHours.mockResolvedValue(undefined);
    mockAbsenceChecker.getConflictingAbsence.mockResolvedValue(null);

    useCase = new MoveAllocationUseCase(
      mockAllocationRepo as unknown as IAllocationRepository,
      mockUserRepo as unknown as IUserRepository,
      mockPhaseRepo as unknown as IProjectPhaseRepository,
      mockAbsenceChecker as unknown as AbsenceConflictChecker
    );
  });

  describe('Move to new date', () => {
    it('should move allocation to new date', async () => {
      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      expect(result.allocation).toBeDefined();
      expect(mockAllocationRepo.moveToDate).toHaveBeenCalledWith(
        'alloc-123',
        new Date('2026-02-07')
      );
    });

    it('should throw NotFoundError when allocation not found', async () => {
      mockAllocationRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          allocationId: 'nonexistent',
          newDate: new Date('2026-02-07'),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when neither newDate nor newProjectPhaseId provided', async () => {
      await expect(
        useCase.execute({
          allocationId: 'alloc-123',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Redistribution at old date', () => {
    it('should redistribute hours at old date when moving', async () => {
      // Existing allocation at old date (after moving, one remains)
      const remainingAllocation = createTestAllocation({
        id: 'alloc-456',
        plannedHours: 4,
      });
      mockAllocationRepo.findByUserAndDate
        .mockResolvedValueOnce([remainingAllocation]) // old date query
        .mockResolvedValueOnce([]); // new date query

      mockAllocationRepo.countByUserAndDate
        .mockResolvedValueOnce(1) // old date count
        .mockResolvedValueOnce(0); // new date count

      await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      // Old date should be redistributed: 1 allocation → 8h
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'alloc-456', plannedHours: 8 },
      ]);
    });

    it('should not redistribute at old date if no allocations remain', async () => {
      mockAllocationRepo.findByUserAndDate.mockResolvedValue([]);
      mockAllocationRepo.countByUserAndDate.mockResolvedValue(0);

      await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      // Moved allocation gets 8h (alone on new day), but no other allocations to redistribute
      // Only update for the moved allocation itself
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledTimes(1);
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'alloc-123', plannedHours: 8 },
      ]);
    });
  });

  describe('Redistribution at new date', () => {
    it('should redistribute hours at new date including moved allocation', async () => {
      // Setup: 1 existing allocation at new date
      mockAllocationRepo.countByUserAndDate.mockResolvedValue(1); // 1 existing at new date

      // After move, findByUserAndDate returns both allocations at new date
      mockAllocationRepo.findByUserAndDate
        .mockResolvedValueOnce([]) // old date query - no remaining
        .mockResolvedValueOnce([
          // new date query - includes moved and existing
          createTestAllocation({ id: 'alloc-123', date: new Date('2026-02-07'), plannedHours: 4 }),
          createTestAllocation({ id: 'existing-123', date: new Date('2026-02-07'), plannedHours: 8 }),
        ]);

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      // Moved allocation should have 4h (8h / 2 allocations)
      expect(result.allocation.plannedHours).toBe(4);

      // Should update existing allocation to 4h as well
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'existing-123', plannedHours: 4 },
      ]);
    });

    it('should redistribute for three allocations at new date', async () => {
      // Setup: 2 existing allocations at new date
      mockAllocationRepo.countByUserAndDate.mockResolvedValue(2);

      mockAllocationRepo.findByUserAndDate
        .mockResolvedValueOnce([]) // old date
        .mockResolvedValueOnce([
          // new date - moved + 2 existing
          createTestAllocation({ id: 'alloc-123', date: new Date('2026-02-07') }),
          createTestAllocation({ id: 'existing-1', date: new Date('2026-02-07') }),
          createTestAllocation({ id: 'existing-2', date: new Date('2026-02-07') }),
        ]);

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      // 3 allocations → ~2.67h each
      expect(result.allocation.plannedHours).toBeCloseTo(2.67, 1);
    });
  });

  describe('Move to new phase', () => {
    it('should move allocation to new phase', async () => {
      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newProjectPhaseId: 'phase-456',
      });

      expect(result.allocation).toBeDefined();
      expect(mockAllocationRepo.moveToPhase).toHaveBeenCalledWith('alloc-123', 'phase-456');
    });

    it('should throw NotFoundError when target phase not found', async () => {
      mockPhaseRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          allocationId: 'alloc-123',
          newProjectPhaseId: 'nonexistent',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should not redistribute when only moving phase (same date)', async () => {
      await useCase.execute({
        allocationId: 'alloc-123',
        newProjectPhaseId: 'phase-456',
      });

      // No redistribution needed when date stays the same
      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
    });
  });

  describe('Move date and phase simultaneously', () => {
    it('should move both date and phase', async () => {
      mockAllocationRepo.moveToDate.mockResolvedValue(
        createTestAllocation({
          date: new Date('2026-02-07'),
          projectPhaseId: 'phase-456',
        })
      );

      await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
        newProjectPhaseId: 'phase-456',
      });

      expect(mockAllocationRepo.moveToDate).toHaveBeenCalled();
      expect(mockAllocationRepo.moveToPhase).toHaveBeenCalled();
    });
  });

  describe('Absence conflict warning', () => {
    it('should warn when moving to date with absence', async () => {
      const absence = createTestAbsence({
        startDate: new Date('2026-02-07'),
        endDate: new Date('2026-02-07'),
      });
      mockAbsenceChecker.getConflictingAbsence.mockResolvedValue(absence);

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'absence_conflict',
          absence: expect.objectContaining({ type: 'vacation' }),
        })
      );
    });

    it('should not warn when no absence conflict', async () => {
      mockAbsenceChecker.getConflictingAbsence.mockResolvedValue(null);

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      expect(result.warnings.filter((w) => w.type === 'absence_conflict')).toHaveLength(0);
    });

    it('should not check absence for resource allocations', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({
          userId: undefined,
          resourceId: 'resource-123',
          plannedHours: undefined,
        })
      );

      await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      expect(mockAbsenceChecker.getConflictingAbsence).not.toHaveBeenCalled();
    });
  });

  describe('Resource allocations', () => {
    it('should move resource allocation without redistribution', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({
          userId: undefined,
          resourceId: 'resource-123',
          plannedHours: undefined,
        })
      );

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-07'),
      });

      expect(result.allocation).toBeDefined();
      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
    });
  });

  describe('Same day move', () => {
    it('should not redistribute when moving to same day', async () => {
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({ date: new Date('2026-02-05') })
      );

      await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-05'),
      });

      expect(mockAllocationRepo.updateManyPlannedHours).not.toHaveBeenCalled();
    });
  });

  describe('Phase date extension', () => {
    it('should extend phase endDate when moving allocation after endDate', async () => {
      mockPhaseRepo.findById.mockResolvedValue({
        id: 'phase-123',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-15'),
      });

      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-20'),
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'phase_extended',
          newEndDate: new Date('2026-02-20'),
        })
      );
      expect(mockPhaseRepo.updateDates).toHaveBeenCalledWith('phase-123', {
        endDate: new Date('2026-02-20'),
      });
    });

    it('should prepone phase startDate when moving allocation before startDate', async () => {
      // Allocation is at 2026-02-15 (within phase range)
      mockAllocationRepo.findById.mockResolvedValue(
        createTestAllocation({ date: new Date('2026-02-15') })
      );

      // Phase starts at 2026-02-10
      mockPhaseRepo.findById.mockResolvedValue({
        id: 'phase-123',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-28'),
      });

      // Move to 2026-02-05 (before phase start)
      const result = await useCase.execute({
        allocationId: 'alloc-123',
        newDate: new Date('2026-02-05'),
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'phase_preponed',
          newStartDate: new Date('2026-02-05'),
        })
      );
      expect(mockPhaseRepo.updateDates).toHaveBeenCalledWith('phase-123', {
        startDate: new Date('2026-02-05'),
      });
    });
  });
});
