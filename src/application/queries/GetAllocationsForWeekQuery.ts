import type { Allocation } from '@/domain/entities/Allocation';
import type { User } from '@/domain/entities/User';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { ITimeEntryRepository } from '@/application/ports/repositories/ITimeEntryRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

import {
  formatDateISO,
  getCalendarWeek,
  getFriday,
  getMonday,
  getWeekDates,
  isToday,
} from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request für GetAllocationsForWeek
 */
export interface GetAllocationsForWeekRequest {
  tenantId: string;
  weekStart: Date; // Montag der Woche
  projectId?: string; // Optional: Filter nach Projekt
  userId?: string; // Optional: Filter nach User
}

/**
 * User-Zusammenfassung für Allocation
 */
export interface UserSummary {
  id: string;
  fullName: string;
  weeklyHours: number;
  dailyCapacity: number; // weeklyHours / 5
}

/**
 * Resource-Zusammenfassung für Allocation
 */
export interface ResourceSummary {
  id: string;
  name: string;
}

/**
 * Phase-Zusammenfassung für Allocation
 */
export interface ProjectPhaseSummary {
  id: string;
  name: string;
  bereich: string;
}

/**
 * Projekt-Zusammenfassung für Allocation
 */
export interface ProjectSummary {
  id: string;
  name: string;
  number?: string;
}

/**
 * Allocation mit allen Details
 */
export interface AllocationWithDetails {
  id: string;
  tenantId: string;
  date: Date;
  plannedHours?: number;
  actualHours: number;
  notes?: string;

  // Verknüpfte Entitäten
  user?: UserSummary;
  resource?: ResourceSummary;
  projectPhase: ProjectPhaseSummary;
  project: ProjectSummary;

  // Flags
  hasAbsenceConflict: boolean;
  absenceType?: string;
}

/**
 * Daten für einen Tag
 */
export interface DayData {
  date: Date;
  dayOfWeek: number; // 0=Mo, 4=Fr
  isToday: boolean;

  allocations: AllocationWithDetails[];

  // Aggregationen pro Tag
  totalPlannedHours: number;
  totalActualHours: number;
  totalCapacity: number;
  utilizationPercent: number;
}

/**
 * Wochensummary
 */
export interface WeekSummary {
  totalPlannedHours: number;
  totalActualHours: number;
  totalCapacity: number;
  utilizationPercent: number;
  userCount: number;
  projectCount: number;
}

/**
 * Response von GetAllocationsForWeek
 */
export interface WeekAllocationData {
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  year: number;

  days: DayData[];
  summary: WeekSummary;
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

interface AbsenceData {
  userId: string;
  type: string;
  startDate: Date;
  endDate: Date;
}

interface TimeEntryData {
  userId: string;
  date: Date;
  hours: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query: GetAllocationsForWeek
 *
 * Lädt alle Allocations für eine Kalenderwoche mit allen Aggregationen.
 *
 * Features:
 * - Allocations gruppiert nach Tag
 * - User/Resource/Project/Phase Details
 * - Abwesenheits-Konflikte markiert
 * - ActualHours aus TimeEntries
 * - Kapazitäts- und Auslastungsberechnung
 *
 * @example
 * ```typescript
 * const data = await query.execute({
 *   tenantId: 'tenant-123',
 *   weekStart: new Date('2026-02-02'),
 * });
 * ```
 */
export class GetAllocationsForWeekQuery {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly userRepository: IUserRepository,
    private readonly projectPhaseRepository: IProjectPhaseRepository,
    private readonly timeEntryRepository: ITimeEntryRepository,
    private readonly absenceRepository: IAbsenceRepository
  ) {}

  async execute(request: GetAllocationsForWeekRequest): Promise<WeekAllocationData> {
    const { tenantId, weekStart, projectId, userId } = request;
    const monday = getMonday(weekStart);
    const friday = getFriday(weekStart);
    const weekDates = getWeekDates(weekStart);

    // 1. Alle Allocations der Woche laden
    const allocations = await this.allocationRepository.findByTenantAndDateRange(
      tenantId,
      monday,
      friday,
      { projectId, userId }
    );

    // 2. IDs sammeln für Batch-Loading
    const userIds = [...new Set(allocations.filter((a) => a.userId).map((a) => a.userId!))];
    const phaseIds = [...new Set(allocations.map((a) => a.projectPhaseId))];

    // 3. Verknüpfte Entitäten laden (Batch für Performance)
    const [users, allUsers, phases, timeEntries, absences] = await Promise.all([
      userIds.length > 0 ? this.userRepository.findByIds(userIds) : Promise.resolve([]),
      this.userRepository.findActiveByTenant(tenantId),
      phaseIds.length > 0
        ? this.projectPhaseRepository.findByIdsWithProject(phaseIds)
        : Promise.resolve([]),
      userIds.length > 0
        ? this.timeEntryRepository.findByUserIdsAndDateRange(userIds, monday, friday)
        : Promise.resolve([]),
      userIds.length > 0
        ? this.absenceRepository.findByUsersAndDateRange(userIds, monday, friday)
        : Promise.resolve([]),
    ]);

    // 4. Lookup-Maps erstellen
    const userMap = new Map(users.map((u) => [u.id, u]));
    const phaseMap = new Map(
      (phases as PhaseWithProject[]).map((p) => [p.id, p])
    );
    const absenceMap = this.buildAbsenceMap(absences as AbsenceData[]);
    const timeEntryMap = this.buildTimeEntryMap(timeEntries as TimeEntryData[]);

    // 5. Tagesweise Daten aufbauen
    const days: DayData[] = weekDates.map((date, index) => {
      const dateString = formatDateISO(date);
      const dayAllocations = allocations.filter(
        (a) => formatDateISO(a.date) === dateString
      );

      const allocationsWithDetails = dayAllocations.map((alloc) =>
        this.enrichAllocation(alloc, userMap, phaseMap, absenceMap, timeEntryMap)
      );

      const totalPlannedHours = allocationsWithDetails.reduce(
        (sum, a) => sum + (a.plannedHours ?? 0),
        0
      );
      const totalActualHours = allocationsWithDetails.reduce(
        (sum, a) => sum + a.actualHours,
        0
      );
      const totalCapacity = this.calculateDailyCapacity(allUsers);

      return {
        date,
        dayOfWeek: index,
        isToday: isToday(date),
        allocations: allocationsWithDetails,
        totalPlannedHours,
        totalActualHours,
        totalCapacity,
        utilizationPercent:
          totalCapacity > 0 ? Math.round((totalPlannedHours / totalCapacity) * 100) : 0,
      };
    });

    // 6. Wochensummary berechnen
    const summary = this.calculateWeekSummary(days, allUsers, phases as PhaseWithProject[]);

    return {
      weekStart: monday,
      weekEnd: friday,
      calendarWeek: getCalendarWeek(monday),
      year: monday.getFullYear(),
      days,
      summary,
    };
  }

  private enrichAllocation(
    alloc: Allocation,
    userMap: Map<string, User>,
    phaseMap: Map<string, PhaseWithProject>,
    absenceMap: Map<string, AbsenceData[]>,
    timeEntryMap: Map<string, TimeEntryData[]>
  ): AllocationWithDetails {
    const user = alloc.userId ? userMap.get(alloc.userId) : undefined;
    const phase = phaseMap.get(alloc.projectPhaseId);

    // Absence Check
    const dateKey = formatDateISO(alloc.date);
    const userAbsences = alloc.userId ? absenceMap.get(`${alloc.userId}-${dateKey}`) : undefined;
    const hasAbsence = !!userAbsences?.length;

    // Actual Hours aus TimeEntries
    const userTimeEntries = alloc.userId
      ? timeEntryMap.get(`${alloc.userId}-${dateKey}`)
      : undefined;
    const actualHours = userTimeEntries?.reduce((sum, te) => sum + te.hours, 0) ?? 0;

    return {
      id: alloc.id,
      tenantId: alloc.tenantId,
      date: alloc.date,
      plannedHours: alloc.plannedHours,
      actualHours,
      notes: alloc.notes,
      user: user
        ? {
            id: user.id,
            fullName: user.fullName,
            weeklyHours: user.weeklyHours,
            dailyCapacity: user.weeklyHours / 5,
          }
        : undefined,
      resource: alloc.resourceId
        ? {
            id: alloc.resourceId,
            name: '', // TODO: Resource details laden
          }
        : undefined,
      projectPhase: phase
        ? {
            id: phase.id,
            name: phase.name,
            bereich: phase.bereich,
          }
        : {
            id: alloc.projectPhaseId,
            name: 'Unbekannte Phase',
            bereich: 'unknown',
          },
      project: phase?.project
        ? {
            id: phase.project.id,
            name: phase.project.name,
            number: phase.project.projectNumber,
          }
        : {
            id: 'unknown',
            name: 'Unbekanntes Projekt',
          },
      hasAbsenceConflict: hasAbsence,
      absenceType: userAbsences?.[0]?.type,
    };
  }

  private buildAbsenceMap(absences: AbsenceData[]): Map<string, AbsenceData[]> {
    const map = new Map<string, AbsenceData[]>();

    for (const absence of absences) {
      // Für jeden Tag im Absence-Bereich einen Eintrag
      const current = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);

      while (current <= endDate) {
        const key = `${absence.userId}-${formatDateISO(current)}`;
        const existing = map.get(key) ?? [];
        existing.push(absence);
        map.set(key, existing);
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }

  private buildTimeEntryMap(entries: TimeEntryData[]): Map<string, TimeEntryData[]> {
    const map = new Map<string, TimeEntryData[]>();

    for (const entry of entries) {
      const key = `${entry.userId}-${formatDateISO(entry.date)}`;
      const existing = map.get(key) ?? [];
      existing.push(entry);
      map.set(key, existing);
    }

    return map;
  }

  private calculateDailyCapacity(users: User[]): number {
    return users.reduce((sum, u) => sum + u.weeklyHours / 5, 0);
  }

  private calculateWeekSummary(
    days: DayData[],
    users: User[],
    phases: PhaseWithProject[]
  ): WeekSummary {
    const totalPlannedHours = days.reduce((sum, d) => sum + d.totalPlannedHours, 0);
    const totalActualHours = days.reduce((sum, d) => sum + d.totalActualHours, 0);
    const totalCapacity = users.reduce((sum, u) => sum + u.weeklyHours, 0);
    const projectIds = new Set(phases.map((p) => p.project.id));

    return {
      totalPlannedHours,
      totalActualHours,
      totalCapacity,
      utilizationPercent:
        totalCapacity > 0 ? Math.round((totalPlannedHours / totalCapacity) * 100) : 0,
      userCount: users.length,
      projectCount: projectIds.size,
    };
  }
}
