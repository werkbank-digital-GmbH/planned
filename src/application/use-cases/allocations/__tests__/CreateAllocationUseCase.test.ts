import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';
import { ProjectPhase } from '@/domain/entities/ProjectPhase';
import { User } from '@/domain/entities/User';
import { NotFoundError, ValidationError } from '@/domain/errors';

import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IResourceRepository } from '@/application/ports/repositories/IResourceRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';
import type { AbsenceConflictChecker } from '@/application/services/AbsenceConflictChecker';

import {
  CreateAllocationUseCase,
  type CreateAllocationRequest,
} from '../CreateAllocationUseCase';

describe('CreateAllocationUseCase', () => {
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

  const mockResourceRepo = {
    findById: vi.fn(),
    findByTenant: vi.fn(),
    findActiveByTenant: vi.fn(),
    findByResourceType: vi.fn(),
    findActiveByResourceType: vi.fn(),
    findByTenantAndName: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasAllocations: vi.fn(),
  };

  const mockAbsenceChecker = {
    hasConflict: vi.fn(),
    getConflictingAbsence: vi.fn(),
    getConflictsForAllocations: vi.fn(),
  };

  let useCase: CreateAllocationUseCase;

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

  const createTestPhase = (overrides = {}) =>
    ProjectPhase.create({
      id: 'phase-123',
      projectId: 'project-123',
      tenantId: 'tenant-123',
      name: 'Elementierung',
      bereich: 'produktion',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      sortOrder: 1,
      budgetHours: 100,
      plannedHours: 0,
      actualHours: 0,
      status: 'active',
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
      startDate: new Date('2026-02-05'),
      endDate: new Date('2026-02-07'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const defaultRequest: CreateAllocationRequest = {
    tenantId: 'tenant-123',
    userId: 'user-123',
    projectPhaseId: 'phase-123',
    date: new Date('2026-02-05'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUserRepo.findById.mockResolvedValue(createTestUser());
    mockPhaseRepo.findById.mockResolvedValue(createTestPhase());
    mockResourceRepo.findById.mockResolvedValue(null);
    mockAllocationRepo.countByUserAndDate.mockResolvedValue(0);
    mockAllocationRepo.findByUserAndDate.mockResolvedValue([]);
    mockAllocationRepo.save.mockImplementation((allocation) =>
      Promise.resolve(allocation)
    );
    mockAbsenceChecker.hasConflict.mockResolvedValue(false);
    mockAbsenceChecker.getConflictingAbsence.mockResolvedValue(null);

    useCase = new CreateAllocationUseCase(
      mockAllocationRepo as unknown as IAllocationRepository,
      mockUserRepo as unknown as IUserRepository,
      mockPhaseRepo as unknown as IProjectPhaseRepository,
      mockResourceRepo as unknown as IResourceRepository,
      mockAbsenceChecker as unknown as AbsenceConflictChecker
    );
  });

  describe('Basic Allocation Creation', () => {
    it('should create allocation with calculated planned hours', async () => {
      const result = await useCase.execute(defaultRequest);

      expect(result.allocation).toBeDefined();
      expect(result.allocation.plannedHours).toBe(8); // 40h/5 Tage
      expect(result.allocation.userId).toBe('user-123');
      expect(result.allocation.projectPhaseId).toBe('phase-123');
      expect(mockAllocationRepo.save).toHaveBeenCalled();
    });

    it('should create allocation with notes', async () => {
      const result = await useCase.execute({
        ...defaultRequest,
        notes: 'Wichtige Notiz',
      });

      expect(result.allocation.notes).toBe('Wichtige Notiz');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(defaultRequest)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(defaultRequest)).rejects.toThrow('User');
    });

    it('should throw NotFoundError when phase not found', async () => {
      mockPhaseRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(defaultRequest)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(defaultRequest)).rejects.toThrow('ProjectPhase');
    });

    it('should throw ValidationError when user is deactivated', async () => {
      mockUserRepo.findById.mockResolvedValue(createTestUser({ isActive: false }));

      await expect(useCase.execute(defaultRequest)).rejects.toThrow(ValidationError);
      await expect(useCase.execute(defaultRequest)).rejects.toThrow('deaktiviert');
    });
  });

  describe('PlannedHours Calculation', () => {
    it('should calculate plannedHours based on weeklyHours', async () => {
      // User with 40h weekly = 8h daily
      const result = await useCase.execute(defaultRequest);
      expect(result.allocation.plannedHours).toBe(8);
    });

    it('should calculate plannedHours for part-time user', async () => {
      mockUserRepo.findById.mockResolvedValue(createTestUser({ weeklyHours: 20 }));

      const result = await useCase.execute(defaultRequest);
      expect(result.allocation.plannedHours).toBe(4); // 20h/5 = 4h
    });
  });

  describe('Multi-Allocation Redistribution', () => {
    it('should redistribute hours for multiple allocations', async () => {
      // Simulate existing allocation
      mockAllocationRepo.countByUserAndDate.mockResolvedValue(1);
      const existingAllocation = Allocation.create({
        id: 'existing-123',
        tenantId: 'tenant-123',
        userId: 'user-123',
        projectPhaseId: 'phase-456',
        date: new Date('2026-02-05'),
        plannedHours: 8,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAllocationRepo.findByUserAndDate.mockResolvedValue([existingAllocation]);

      const result = await useCase.execute(defaultRequest);

      // New allocation: 4h (8h / 2)
      expect(result.allocation.plannedHours).toBe(4);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ type: 'multi_allocation', count: 2 })
      );
      // Existing allocation should be updated
      expect(mockAllocationRepo.updateManyPlannedHours).toHaveBeenCalledWith([
        { id: 'existing-123', plannedHours: 4 },
      ]);
    });

    it('should redistribute hours for three allocations', async () => {
      mockAllocationRepo.countByUserAndDate.mockResolvedValue(2);
      const existingAllocations = [
        Allocation.create({
          id: 'existing-1',
          tenantId: 'tenant-123',
          userId: 'user-123',
          projectPhaseId: 'phase-1',
          date: new Date('2026-02-05'),
          plannedHours: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        Allocation.create({
          id: 'existing-2',
          tenantId: 'tenant-123',
          userId: 'user-123',
          projectPhaseId: 'phase-2',
          date: new Date('2026-02-05'),
          plannedHours: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];
      mockAllocationRepo.findByUserAndDate.mockResolvedValue(existingAllocations);

      const result = await useCase.execute(defaultRequest);

      // 40h/5 = 8h daily / 3 allocations = 2.67h (rounded to 2 decimals)
      expect(result.allocation.plannedHours).toBeCloseTo(2.67, 1);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ type: 'multi_allocation', count: 3 })
      );
    });
  });

  describe('Absence Conflict Warning', () => {
    it('should warn about absence conflict but still create allocation', async () => {
      const absence = createTestAbsence();
      mockAbsenceChecker.hasConflict.mockResolvedValue(true);
      mockAbsenceChecker.getConflictingAbsence.mockResolvedValue(absence);

      const result = await useCase.execute(defaultRequest);

      expect(result.allocation).toBeDefined();
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: 'absence_conflict',
          absence: expect.objectContaining({ type: 'vacation' }),
        })
      );
    });

    it('should not warn when no absence conflict', async () => {
      const result = await useCase.execute(defaultRequest);

      expect(result.warnings.filter((w) => w.type === 'absence_conflict')).toHaveLength(0);
    });
  });

  describe('Phase Date Extension', () => {
    it('should extend phase endDate when allocation is after endDate', async () => {
      mockPhaseRepo.findById.mockResolvedValue(
        createTestPhase({
          startDate: new Date('2026-02-01'),
          endDate: new Date('2026-02-15'),
        })
      );

      const result = await useCase.execute({
        ...defaultRequest,
        date: new Date('2026-02-20'),
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

    it('should prepone phase startDate when allocation is before startDate', async () => {
      mockPhaseRepo.findById.mockResolvedValue(
        createTestPhase({
          startDate: new Date('2026-02-10'),
          endDate: new Date('2026-02-28'),
        })
      );

      const result = await useCase.execute({
        ...defaultRequest,
        date: new Date('2026-02-05'),
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

    it('should not update phase dates when allocation is within range', async () => {
      const result = await useCase.execute(defaultRequest);

      expect(mockPhaseRepo.updateDates).not.toHaveBeenCalled();
      expect(result.warnings.filter((w) => w.type === 'phase_extended')).toHaveLength(0);
      expect(result.warnings.filter((w) => w.type === 'phase_preponed')).toHaveLength(0);
    });
  });

  describe('Resource Allocation', () => {
    it('should create allocation for resource without plannedHours', async () => {
      mockResourceRepo.findById.mockResolvedValue({
        id: 'resource-123',
        tenantId: 'tenant-123',
        name: 'Sprinter 1',
        isActive: true,
      });

      const result = await useCase.execute({
        tenantId: 'tenant-123',
        resourceId: 'resource-123',
        projectPhaseId: 'phase-123',
        date: new Date('2026-02-05'),
      });

      expect(result.allocation.resourceId).toBe('resource-123');
      expect(result.allocation.userId).toBeUndefined();
      expect(result.allocation.plannedHours).toBeUndefined();
    });

    it('should throw NotFoundError when resource not found', async () => {
      mockResourceRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          resourceId: 'resource-123',
          projectPhaseId: 'phase-123',
          date: new Date('2026-02-05'),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when resource is deactivated', async () => {
      mockResourceRepo.findById.mockResolvedValue({
        id: 'resource-123',
        tenantId: 'tenant-123',
        name: 'Sprinter 1',
        isActive: false,
      });

      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          resourceId: 'resource-123',
          projectPhaseId: 'phase-123',
          date: new Date('2026-02-05'),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should not check absence for resource allocation', async () => {
      mockResourceRepo.findById.mockResolvedValue({
        id: 'resource-123',
        tenantId: 'tenant-123',
        name: 'Sprinter 1',
        isActive: true,
      });

      await useCase.execute({
        tenantId: 'tenant-123',
        resourceId: 'resource-123',
        projectPhaseId: 'phase-123',
        date: new Date('2026-02-05'),
      });

      expect(mockAbsenceChecker.getConflictingAbsence).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should throw ValidationError when neither userId nor resourceId provided', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          projectPhaseId: 'phase-123',
          date: new Date('2026-02-05'),
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when both userId and resourceId provided', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          userId: 'user-123',
          resourceId: 'resource-123',
          projectPhaseId: 'phase-123',
          date: new Date('2026-02-05'),
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
