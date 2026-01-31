import { describe, expect, it, vi } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';
import { User } from '@/domain/entities/User';

import { GetDashboardDataQuery } from '../GetDashboardDataQuery';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockUserRepository = {
  findActiveByTenant: vi.fn(),
};

const mockAllocationRepository = {
  findByTenantAndDateRange: vi.fn(),
};

const mockAbsenceRepository = {
  findByTenantAndDateRange: vi.fn(),
};

const mockProjectPhaseRepository = {
  findByIdsWithProject: vi.fn(),
};

// Helper: Erstelle Test-User
function createTestUser(overrides: Partial<Parameters<typeof User.create>[0]> = {}) {
  return User.create({
    id: overrides.id ?? crypto.randomUUID(),
    tenantId: 'tenant-1',
    authId: 'auth-1',
    email: 'test@example.com',
    fullName: 'Max Mustermann',
    role: 'mitarbeiter',
    weeklyHours: 40,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

// Helper: Erstelle Test-Allocation
function createTestAllocation(date: Date, plannedHours: number, phaseId = 'phase-1') {
  return Allocation.create({
    id: crypto.randomUUID(),
    tenantId: 'tenant-1',
    projectPhaseId: phaseId,
    userId: 'user-1',
    date,
    plannedHours,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Helper: Erstelle Test-Absence
function createTestAbsence(
  userId: string,
  startDate: Date,
  endDate: Date,
  type: 'vacation' | 'sick' | 'holiday' | 'training' | 'other' = 'vacation'
) {
  return Absence.create({
    id: crypto.randomUUID(),
    tenantId: 'tenant-1',
    userId,
    type,
    startDate,
    endDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('GetDashboardDataQuery', () => {
  const createQuery = () =>
    new GetDashboardDataQuery(
      mockUserRepository as never,
      mockAllocationRepository as never,
      mockAbsenceRepository as never,
      mockProjectPhaseRepository as never
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepository.findActiveByTenant.mockResolvedValue([]);
    mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue([]);
    mockAbsenceRepository.findByTenantAndDateRange.mockResolvedValue([]);
    mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([]);
  });

  describe('weeklyUtilization', () => {
    it('should return 5 days of utilization data', async () => {
      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.weeklyUtilization).toHaveLength(5);
      expect(result.weeklyUtilization[0].dayName).toBe('Mo');
      expect(result.weeklyUtilization[4].dayName).toBe('Fr');
    });

    it('should calculate capacity from users', async () => {
      const users = [
        createTestUser({ weeklyHours: 40 }),
        createTestUser({ weeklyHours: 30 }),
      ];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      // (40 + 30) / 5 = 14h per day
      expect(result.weeklyUtilization[0].capacity).toBe(14);
    });

    it('should calculate planned hours from allocations', async () => {
      const users = [createTestUser({ weeklyHours: 40 })];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      // Montag der aktuellen Woche
      const today = new Date();
      const dayOfWeek = today.getUTCDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);

      const allocations = [
        createTestAllocation(monday, 6),
        createTestAllocation(monday, 2),
      ];
      mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue(allocations);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.weeklyUtilization[0].planned).toBe(8);
    });

    it('should calculate utilization percentage', async () => {
      const users = [createTestUser({ weeklyHours: 40 })]; // 8h/day
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const today = new Date();
      const dayOfWeek = today.getUTCDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setUTCDate(today.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);

      const allocations = [createTestAllocation(monday, 4)]; // 50% of 8h
      mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue(allocations);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.weeklyUtilization[0].utilizationPercent).toBe(50);
    });
  });

  describe('teamCapacity', () => {
    it('should return team capacity metrics', async () => {
      const users = [
        createTestUser({ weeklyHours: 40 }),
        createTestUser({ weeklyHours: 40 }),
      ];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.teamCapacity).toHaveProperty('activeUsers');
      expect(result.teamCapacity).toHaveProperty('weeklyCapacity');
      expect(result.teamCapacity).toHaveProperty('plannedHours');
      expect(result.teamCapacity).toHaveProperty('freeCapacity');
      expect(result.teamCapacity).toHaveProperty('utilizationPercent');
    });

    it('should count active users', async () => {
      const users = [createTestUser(), createTestUser(), createTestUser()];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.teamCapacity.activeUsers).toBe(3);
    });

    it('should calculate weekly capacity', async () => {
      const users = [
        createTestUser({ weeklyHours: 40 }),
        createTestUser({ weeklyHours: 30 }),
      ];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.teamCapacity.weeklyCapacity).toBe(70);
    });

    it('should calculate free capacity correctly', async () => {
      const users = [createTestUser({ weeklyHours: 40 })];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const today = new Date();
      const allocations = [createTestAllocation(today, 10)];
      mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue(allocations);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.teamCapacity.weeklyCapacity).toBe(40);
      expect(result.teamCapacity.plannedHours).toBe(10);
      expect(result.teamCapacity.freeCapacity).toBe(30);
    });
  });

  describe('topProjects', () => {
    it('should return top 5 projects', async () => {
      const today = new Date();
      const allocations = [
        createTestAllocation(today, 10, 'phase-1'),
        createTestAllocation(today, 8, 'phase-2'),
        createTestAllocation(today, 6, 'phase-3'),
        createTestAllocation(today, 4, 'phase-4'),
        createTestAllocation(today, 2, 'phase-5'),
        createTestAllocation(today, 1, 'phase-6'), // Sollte nicht enthalten sein
      ];
      mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue(allocations);

      mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([
        { id: 'phase-1', name: 'Phase 1', bereich: 'produktion', project: { id: 'p1', name: 'Projekt 1' } },
        { id: 'phase-2', name: 'Phase 2', bereich: 'produktion', project: { id: 'p2', name: 'Projekt 2' } },
        { id: 'phase-3', name: 'Phase 3', bereich: 'montage', project: { id: 'p3', name: 'Projekt 3' } },
        { id: 'phase-4', name: 'Phase 4', bereich: 'montage', project: { id: 'p4', name: 'Projekt 4' } },
        { id: 'phase-5', name: 'Phase 5', bereich: 'produktion', project: { id: 'p5', name: 'Projekt 5' } },
      ]);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.topProjects).toHaveLength(5);
      expect(result.topProjects[0].hoursThisWeek).toBe(10);
      expect(result.topProjects[0].name).toBe('Projekt 1');
    });

    it('should sort projects by hours descending', async () => {
      const today = new Date();
      const allocations = [
        createTestAllocation(today, 5, 'phase-1'),
        createTestAllocation(today, 15, 'phase-2'),
        createTestAllocation(today, 10, 'phase-3'),
      ];
      mockAllocationRepository.findByTenantAndDateRange.mockResolvedValue(allocations);

      mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([
        { id: 'phase-2', name: 'Phase 2', bereich: 'produktion', project: { id: 'p2', name: 'Projekt B' } },
        { id: 'phase-3', name: 'Phase 3', bereich: 'produktion', project: { id: 'p3', name: 'Projekt C' } },
        { id: 'phase-1', name: 'Phase 1', bereich: 'produktion', project: { id: 'p1', name: 'Projekt A' } },
      ]);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.topProjects[0].hoursThisWeek).toBe(15);
      expect(result.topProjects[1].hoursThisWeek).toBe(10);
      expect(result.topProjects[2].hoursThisWeek).toBe(5);
    });
  });

  describe('upcomingAbsences', () => {
    it('should return upcoming absences sorted by date', async () => {
      const users = [
        createTestUser({ id: 'user-1', fullName: 'Max Müller' }),
        createTestUser({ id: 'user-2', fullName: 'Anna Schmidt' }),
      ];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const absences = [
        createTestAbsence('user-1', nextWeek, nextWeek, 'vacation'),
        createTestAbsence('user-2', tomorrow, tomorrow, 'sick'),
      ];
      mockAbsenceRepository.findByTenantAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.upcomingAbsences).toHaveLength(2);
      // Sollte nach Datum sortiert sein
      expect(result.upcomingAbsences[0].type).toBe('sick');
      expect(result.upcomingAbsences[1].type).toBe('vacation');
    });

    it('should include user name in absence summary', async () => {
      const users = [createTestUser({ id: 'user-1', fullName: 'Max Müller' })];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const absences = [createTestAbsence('user-1', tomorrow, tomorrow)];
      mockAbsenceRepository.findByTenantAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.upcomingAbsences[0].userName).toBe('Max Müller');
    });

    it('should limit to 10 absences', async () => {
      const users = [createTestUser({ id: 'user-1' })];
      mockUserRepository.findActiveByTenant.mockResolvedValue(users);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const absences = Array.from({ length: 15 }, () =>
        createTestAbsence('user-1', tomorrow, tomorrow)
      );
      mockAbsenceRepository.findByTenantAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.upcomingAbsences).toHaveLength(10);
    });
  });

  describe('week range', () => {
    it('should return week start and end dates', async () => {
      const query = createQuery();
      const result = await query.execute({ tenantId: 'tenant-1' });

      expect(result.weekStart).toBeDefined();
      expect(result.weekEnd).toBeDefined();
      expect(result.calendarWeek).toBeGreaterThan(0);
      expect(result.calendarWeek).toBeLessThanOrEqual(53);
    });

    it('should use provided weekStart', async () => {
      const customWeekStart = new Date('2026-02-02'); // Ein Montag

      const query = createQuery();
      const result = await query.execute({
        tenantId: 'tenant-1',
        weekStart: customWeekStart,
      });

      expect(result.weekStart.getUTCDay()).toBe(1); // Montag
    });
  });
});
