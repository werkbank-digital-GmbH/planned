import type { Allocation } from '@/domain/entities/Allocation';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';

import { formatDateISO, getCalendarWeek, getFriday, getMonday, getWeekDates } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request für GetMyWeekQuery
 */
export interface GetMyWeekRequest {
  userId: string;
  weekStart: Date;
}

/**
 * Absence-Typ (für Anzeige)
 */
export type AbsenceType = 'vacation' | 'sick' | 'holiday' | 'training' | 'other';

/**
 * Allocation für MyWeek View
 */
export interface MyAllocation {
  id: string;
  projectName: string;
  projectNumber?: string;
  phaseName: string;
  plannedHours: number;
  notes?: string;
  bereich: 'produktion' | 'montage';
}

/**
 * Tag in MyWeek
 */
export interface MyWeekDay {
  date: Date;
  dayName: string;
  allocations: MyAllocation[];
  absence?: {
    type: AbsenceType;
    note?: string;
  };
}

/**
 * Response von GetMyWeekQuery
 */
export interface MyWeekData {
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  days: MyWeekDay[];
  totalPlannedHours: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseWithProject {
  id: string;
  name: string;
  bereich: string;
  project: {
    id: string;
    name: string;
    projectNumber?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query: GetMyWeekQuery
 *
 * Lädt die Wochen-Allocations für einen einzelnen User (Mobile View).
 *
 * Features:
 * - Allocations gruppiert nach Tag
 * - Projekt/Phase Details
 * - Abwesenheiten markiert
 * - Wochen-Navigation
 *
 * @example
 * ```typescript
 * const data = await query.execute({
 *   userId: 'user-123',
 *   weekStart: new Date('2026-02-02'),
 * });
 * ```
 */
export class GetMyWeekQuery {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly absenceRepository: IAbsenceRepository,
    private readonly projectPhaseRepository: IProjectPhaseRepository
  ) {}

  async execute(request: GetMyWeekRequest): Promise<MyWeekData> {
    const { userId, weekStart } = request;
    const monday = getMonday(weekStart);
    const friday = getFriday(weekStart);
    const weekDates = getWeekDates(weekStart);

    // 1. Daten parallel laden
    const [allocations, absences] = await Promise.all([
      this.allocationRepository.findByUserAndDateRange(userId, monday, friday),
      this.absenceRepository.findByUserAndDateRange(userId, monday, friday),
    ]);

    // 2. Phasen mit Projekt-Details laden
    const phaseIds = [...new Set(allocations.map((a) => a.projectPhaseId))];
    const phases =
      phaseIds.length > 0
        ? ((await this.projectPhaseRepository.findByIdsWithProject(phaseIds)) as PhaseWithProject[])
        : [];
    const phaseMap = new Map(phases.map((p) => [p.id, p]));

    // 3. Absence-Map für schnellen Lookup
    const absenceMap = this.buildAbsenceMap(absences);

    // 4. Tage aufbauen
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const days: MyWeekDay[] = weekDates.map((date, index) => {
      const dateKey = formatDateISO(date);
      const dayAllocations = allocations.filter((a) => formatDateISO(a.date) === dateKey);

      const mappedAllocations = dayAllocations.map((alloc) =>
        this.mapAllocation(alloc, phaseMap)
      );

      const absence = absenceMap.get(dateKey);

      return {
        date,
        dayName: dayNames[index],
        allocations: mappedAllocations,
        absence: absence
          ? { type: absence.type as AbsenceType, note: absence.note }
          : undefined,
      };
    });

    // 5. Gesamt-Stunden berechnen
    const totalPlannedHours = allocations.reduce((sum, a) => sum + (a.plannedHours ?? 0), 0);

    return {
      weekStart: monday,
      weekEnd: friday,
      calendarWeek: getCalendarWeek(monday),
      days,
      totalPlannedHours,
    };
  }

  private mapAllocation(
    alloc: Allocation,
    phaseMap: Map<string, PhaseWithProject>
  ): MyAllocation {
    const phase = phaseMap.get(alloc.projectPhaseId);

    return {
      id: alloc.id,
      projectName: phase?.project.name ?? 'Unbekanntes Projekt',
      projectNumber: phase?.project.projectNumber,
      phaseName: phase?.name ?? 'Unbekannte Phase',
      plannedHours: alloc.plannedHours ?? 0,
      notes: alloc.notes,
      bereich: (phase?.bereich as 'produktion' | 'montage') ?? 'produktion',
    };
  }

  private buildAbsenceMap(
    absences: { startDate: Date; endDate: Date; type: string; note?: string }[]
  ): Map<string, { type: string; note?: string }> {
    const map = new Map<string, { type: string; note?: string }>();

    for (const absence of absences) {
      const current = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);

      while (current <= endDate) {
        const key = formatDateISO(current);
        // Nur ersten Eintrag pro Tag speichern
        if (!map.has(key)) {
          map.set(key, { type: absence.type, note: undefined });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }
}
