import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Allocation } from '@/domain/entities/Allocation';
import { User } from '@/domain/entities/User';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

import { GetAllocationsForWeekQuery } from '../GetAllocationsForWeekQuery';

describe('GetAllocationsForWeekQuery', () => {
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
    findByIds: vi.fn(),
    findByIdsWithProject: vi.fn(),
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

  const mockAbsenceRepo = {
    findById: vi.fn(),
    findByUserAndDateRange: vi.fn(),
    findByUsersAndDateRange: vi.fn(),
    findByTenantAndDateRange: vi.fn(),
    findActiveByTenant: vi.fn(),
    save: vi.fn(),
    saveMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  let query: GetAllocationsForWeekQuery;

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
      date: new Date('2026-02-02'),
      plannedHours: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  const createTestPhaseWithProject = (overrides = {}) => ({
    id: 'phase-123',
    tenantId: 'tenant-123',
    projectId: 'project-123',
    name: 'Elementierung',
    bereich: 'produktion' as const,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    project: {
      id: 'project-123',
      name: 'Schulhaus Muster',
      projectNumber: '2026-001',
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([]);
    mockUserRepo.findByIds.mockResolvedValue([]);
    mockUserRepo.findActiveByTenant.mockResolvedValue([]);
    mockPhaseRepo.findByIdsWithProject.mockResolvedValue([]);
    mockAbsenceRepo.findByUsersAndDateRange.mockResolvedValue([]);

    query = new GetAllocationsForWeekQuery(
      mockAllocationRepo as unknown as IAllocationRepository,
      mockUserRepo as unknown as IUserRepository,
      mockPhaseRepo as unknown as IProjectPhaseRepository,
      mockAbsenceRepo as unknown as IAbsenceRepository
    );
  });

  describe('Basic week data', () => {
    it('should return 5 days for work week (Mo-Fr)', async () => {
      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'), // Monday
      });

      expect(result.days).toHaveLength(5);
      expect(result.days[0].dayOfWeek).toBe(0); // Monday
      expect(result.days[4].dayOfWeek).toBe(4); // Friday
    });

    it('should return correct calendar week and year', async () => {
      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.calendarWeek).toBe(6); // KW 6
      expect(result.year).toBe(2026);
    });

    it('should return correct week start and end dates', async () => {
      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.weekStart.toISOString().split('T')[0]).toBe('2026-02-02');
      expect(result.weekEnd.toISOString().split('T')[0]).toBe('2026-02-06');
    });
  });

  describe('Allocations loading', () => {
    it('should load allocations for the week', async () => {
      const allocations = [
        createTestAllocation({ id: 'alloc-1', date: new Date('2026-02-02') }),
        createTestAllocation({ id: 'alloc-2', date: new Date('2026-02-03') }),
      ];
      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue(allocations);
      mockUserRepo.findByIds.mockResolvedValue([createTestUser()]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations).toHaveLength(1);
      expect(result.days[1].allocations).toHaveLength(1);
      expect(result.days[2].allocations).toHaveLength(0);
    });

    it('should include user details in allocations', async () => {
      const user = createTestUser({ id: 'user-1', fullName: 'Max Mustermann' });
      const allocation = createTestAllocation({ userId: 'user-1' });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([user]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations[0].user).toBeDefined();
      expect(result.days[0].allocations[0].user?.fullName).toBe('Max Mustermann');
      expect(result.days[0].allocations[0].user?.dailyCapacity).toBe(8); // 40h / 5
    });

    it('should include project and phase details in allocations', async () => {
      const phase = createTestPhaseWithProject({
        name: 'Elementierung',
        project: { id: 'proj-1', name: 'Schulhaus', projectNumber: '2026-001' },
      });
      const allocation = createTestAllocation({ projectPhaseId: phase.id });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([createTestUser()]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([phase]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations[0].projectPhase.name).toBe('Elementierung');
      expect(result.days[0].allocations[0].project.name).toBe('Schulhaus');
    });
  });

  describe('Daily aggregations', () => {
    it('should calculate total planned hours per day', async () => {
      const allocations = [
        createTestAllocation({ id: 'alloc-1', date: new Date('2026-02-02'), plannedHours: 4 }),
        createTestAllocation({
          id: 'alloc-2',
          date: new Date('2026-02-02'),
          userId: 'user-2',
          plannedHours: 8,
        }),
      ];
      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue(allocations);
      mockUserRepo.findByIds.mockResolvedValue([
        createTestUser({ id: 'user-123' }),
        createTestUser({ id: 'user-2' }),
      ]);
      mockUserRepo.findActiveByTenant.mockResolvedValue([
        createTestUser({ id: 'user-123' }),
        createTestUser({ id: 'user-2' }),
      ]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].totalPlannedHours).toBe(12); // 4 + 8
    });

    it('should calculate utilization percentage', async () => {
      const allocation = createTestAllocation({ plannedHours: 8 });
      const user = createTestUser({ weeklyHours: 40 }); // 8h daily capacity

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([user]);
      mockUserRepo.findActiveByTenant.mockResolvedValue([user]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      // 8h planned / 8h capacity = 100%
      expect(result.days[0].utilizationPercent).toBe(100);
    });
  });

  describe('Absence conflict detection', () => {
    it('should mark allocations with absence conflicts', async () => {
      const allocation = createTestAllocation({
        userId: 'user-1',
        date: new Date('2026-02-02'),
      });
      const absence = {
        id: 'absence-1',
        userId: 'user-1',
        type: 'vacation' as const,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-02'),
      };

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([createTestUser({ id: 'user-1' })]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);
      mockAbsenceRepo.findByUsersAndDateRange.mockResolvedValue([absence]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations[0].hasAbsenceConflict).toBe(true);
      expect(result.days[0].allocations[0].absenceType).toBe('vacation');
    });

    it('should not mark allocations without absence conflicts', async () => {
      const allocation = createTestAllocation({
        userId: 'user-1',
        date: new Date('2026-02-02'),
      });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([createTestUser({ id: 'user-1' })]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);
      mockAbsenceRepo.findByUsersAndDateRange.mockResolvedValue([]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations[0].hasAbsenceConflict).toBe(false);
    });
  });

  describe('Actual hours', () => {
    it('should return 0 actual hours (Asana integration pending)', async () => {
      const allocation = createTestAllocation({
        userId: 'user-1',
        date: new Date('2026-02-02'),
      });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockUserRepo.findByIds.mockResolvedValue([createTestUser({ id: 'user-1' })]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      // TODO: Actual hours will come from Asana integration
      expect(result.days[0].allocations[0].actualHours).toBe(0);
      expect(result.days[0].totalActualHours).toBe(0);
    });
  });

  describe('Week summary', () => {
    it('should calculate week summary correctly', async () => {
      const allocations = [
        createTestAllocation({
          id: 'alloc-1',
          date: new Date('2026-02-02'),
          plannedHours: 8,
        }),
        createTestAllocation({
          id: 'alloc-2',
          date: new Date('2026-02-03'),
          plannedHours: 4,
        }),
      ];
      const user = createTestUser({ weeklyHours: 40 });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue(allocations);
      mockUserRepo.findByIds.mockResolvedValue([user]);
      mockUserRepo.findActiveByTenant.mockResolvedValue([user]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.summary.totalPlannedHours).toBe(12); // 8 + 4
      expect(result.summary.totalCapacity).toBe(40); // 1 user * 40h
      expect(result.summary.utilizationPercent).toBe(30); // 12/40 = 30%
      expect(result.summary.userCount).toBe(1);
      expect(result.summary.projectCount).toBe(1);
    });
  });

  describe('Filtering', () => {
    it('should filter by project when projectId provided', async () => {
      await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
        projectId: 'project-456',
      });

      expect(mockAllocationRepo.findByTenantAndDateRange).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Date),
        expect.any(Date),
        { projectId: 'project-456', userId: undefined }
      );
    });

    it('should filter by user when userId provided', async () => {
      await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
        userId: 'user-456',
      });

      expect(mockAllocationRepo.findByTenantAndDateRange).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Date),
        expect.any(Date),
        { projectId: undefined, userId: 'user-456' }
      );
    });
  });

  describe('Resource allocations', () => {
    it('should handle resource allocations without user', async () => {
      const allocation = createTestAllocation({
        userId: undefined,
        resourceId: 'resource-123',
        plannedHours: undefined,
      });

      mockAllocationRepo.findByTenantAndDateRange.mockResolvedValue([allocation]);
      mockPhaseRepo.findByIdsWithProject.mockResolvedValue([createTestPhaseWithProject()]);

      const result = await query.execute({
        tenantId: 'tenant-123',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days[0].allocations[0].user).toBeUndefined();
      expect(result.days[0].allocations[0].hasAbsenceConflict).toBe(false);
    });
  });
});
