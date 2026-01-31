import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Absence } from '@/domain/entities/Absence';
import { Allocation } from '@/domain/entities/Allocation';

import { GetMyWeekQuery } from '../GetMyWeekQuery';

// ═══════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════

const mockAllocationRepository = {
  findByUserAndDateRange: vi.fn(),
};

const mockAbsenceRepository = {
  findByUserAndDateRange: vi.fn(),
};

const mockProjectPhaseRepository = {
  findByIdsWithProject: vi.fn(),
};

// Helper: Erstelle Test-Allocation
function createTestAllocation(
  date: Date,
  plannedHours: number,
  phaseId = 'phase-1',
  userId = 'user-1'
) {
  return Allocation.create({
    id: crypto.randomUUID(),
    tenantId: 'tenant-1',
    projectPhaseId: phaseId,
    userId,
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

describe('GetMyWeekQuery', () => {
  const createQuery = () =>
    new GetMyWeekQuery(
      mockAllocationRepository as never,
      mockAbsenceRepository as never,
      mockProjectPhaseRepository as never
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockAllocationRepository.findByUserAndDateRange.mockResolvedValue([]);
    mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue([]);
    mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([]);
  });

  describe('execute', () => {
    it('should return allocations for current user only', async () => {
      const weekStart = new Date('2026-02-02'); // Montag
      const allocations = [
        createTestAllocation(weekStart, 8, 'phase-1', 'user-1'),
        createTestAllocation(weekStart, 4, 'phase-2', 'user-1'),
      ];
      mockAllocationRepository.findByUserAndDateRange.mockResolvedValue(allocations);

      mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([
        {
          id: 'phase-1',
          name: 'Elementierung',
          bereich: 'produktion',
          project: { id: 'p1', name: 'Schulhaus Muster', projectNumber: 'P-2026-001' },
        },
        {
          id: 'phase-2',
          name: 'Montage',
          bereich: 'montage',
          project: { id: 'p2', name: 'Bürogebäude', projectNumber: 'P-2026-002' },
        },
      ]);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      expect(result.days).toHaveLength(5);
      expect(result.days[0].allocations).toHaveLength(2);
      expect(mockAllocationRepository.findByUserAndDateRange).toHaveBeenCalledWith(
        'user-1',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should include absences for current user', async () => {
      const weekStart = new Date('2026-02-02'); // Montag
      const wednesday = new Date('2026-02-04');

      const absences = [createTestAbsence('user-1', wednesday, wednesday, 'vacation')];
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      expect(result.days[2].absence).toBeDefined();
      expect(result.days[2].absence?.type).toBe('vacation');
    });

    it('should return 5 days (Mo-Fr)', async () => {
      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days).toHaveLength(5);
      expect(result.days[0].dayName).toBe('Mo');
      expect(result.days[4].dayName).toBe('Fr');
    });

    it('should calculate calendar week', async () => {
      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.calendarWeek).toBe(6); // KW 6 im Jahr 2026
    });

    it('should calculate total planned hours', async () => {
      const weekStart = new Date('2026-02-02');
      const allocations = [
        createTestAllocation(weekStart, 8, 'phase-1', 'user-1'),
        createTestAllocation(new Date('2026-02-03'), 6, 'phase-1', 'user-1'),
        createTestAllocation(new Date('2026-02-04'), 4, 'phase-1', 'user-1'),
      ];
      mockAllocationRepository.findByUserAndDateRange.mockResolvedValue(allocations);

      mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([
        {
          id: 'phase-1',
          name: 'Phase 1',
          bereich: 'produktion',
          project: { id: 'p1', name: 'Projekt 1' },
        },
      ]);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      expect(result.totalPlannedHours).toBe(18);
    });

    it('should include project and phase details in allocations', async () => {
      const weekStart = new Date('2026-02-02');
      const allocations = [createTestAllocation(weekStart, 8, 'phase-1', 'user-1')];
      mockAllocationRepository.findByUserAndDateRange.mockResolvedValue(allocations);

      mockProjectPhaseRepository.findByIdsWithProject.mockResolvedValue([
        {
          id: 'phase-1',
          name: 'Elementierung',
          bereich: 'produktion',
          project: { id: 'p1', name: 'Schulhaus Muster', projectNumber: 'P-2026-001' },
        },
      ]);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      const alloc = result.days[0].allocations[0];
      expect(alloc.projectName).toBe('Schulhaus Muster');
      expect(alloc.phaseName).toBe('Elementierung');
      expect(alloc.bereich).toBe('produktion');
    });

    it('should mark days with absence correctly', async () => {
      const weekStart = new Date('2026-02-02');
      const wednesday = new Date('2026-02-04');
      const thursday = new Date('2026-02-05');

      // 2-Tages-Urlaub
      const absences = [createTestAbsence('user-1', wednesday, thursday, 'vacation')];
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      expect(result.days[0].absence).toBeUndefined(); // Montag
      expect(result.days[1].absence).toBeUndefined(); // Dienstag
      expect(result.days[2].absence).toBeDefined(); // Mittwoch
      expect(result.days[3].absence).toBeDefined(); // Donnerstag
      expect(result.days[4].absence).toBeUndefined(); // Freitag
    });

    it('should handle sick days', async () => {
      const weekStart = new Date('2026-02-02');

      const absences = [createTestAbsence('user-1', weekStart, weekStart, 'sick')];
      mockAbsenceRepository.findByUserAndDateRange.mockResolvedValue(absences);

      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart,
      });

      expect(result.days[0].absence?.type).toBe('sick');
    });

    it('should return empty allocations if none exist', async () => {
      const query = createQuery();
      const result = await query.execute({
        userId: 'user-1',
        weekStart: new Date('2026-02-02'),
      });

      expect(result.days.every((d) => d.allocations.length === 0)).toBe(true);
      expect(result.totalPlannedHours).toBe(0);
    });
  });
});
