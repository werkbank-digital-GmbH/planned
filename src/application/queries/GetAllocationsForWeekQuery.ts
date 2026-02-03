import type { InsightStatus } from '@/domain/analytics/types';
import type { Allocation } from '@/domain/entities/Allocation';
import type { User } from '@/domain/entities/User';
import type { PhaseBereich, ProjectStatus } from '@/domain/types';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IProjectRepository } from '@/application/ports/repositories/IProjectRepository';
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
// PROJECT-CENTRIC TYPES (für das neue Planungs-Grid)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verfügbarkeits-Status für einen Tag (Pool).
 */
export type AvailabilityStatus = 'available' | 'partial' | 'busy' | 'absence';

/**
 * Verfügbarkeit für einen einzelnen Tag.
 */
export interface DayAvailability {
  date: Date;
  status: AvailabilityStatus;
  allocationsCount: number;
}

/**
 * Ein Element im Ressourcen-Pool (Mitarbeiter oder Ressource).
 */
export interface PoolItem {
  type: 'user' | 'resource';
  id: string;
  name: string;
  role?: string; // Für User: Position/Rolle
  resourceType?: string; // Für Resource: Typ (Transporter, Kran, etc.)
  weeklyHours?: number; // Nur für User
  availability: DayAvailability[]; // 5 Tage (Mo-Fr)
  hasAbsence: boolean;
  absenceLabel?: string; // z.B. "Urlaub Di-Mi"
}

/**
 * Daten für eine Phasen-Zeile (unter dem Projekt).
 */
export interface PhaseRowData {
  phase: {
    id: string;
    name: string;
    bereich: PhaseBereich;
    startDate?: Date;
    endDate?: Date;
    budgetHours?: number;
    plannedHours?: number;
    actualHours?: number;
  };
  // Allocations pro Tag (key = "YYYY-MM-DD")
  dayAllocations: Record<string, AllocationWithDetails[]>;
  // Ob diese Phase in der aktuellen Woche aktiv ist
  isActiveThisWeek: boolean;
  // Status aus phase_insights (optional, wenn kein Insight vorhanden)
  insightStatus?: InsightStatus;
}

/**
 * Daten für eine Projekt-Zeile im Grid.
 */
export interface ProjectRowData {
  project: {
    id: string;
    name: string;
    status: ProjectStatus;
    address?: string;
  };
  phases: PhaseRowData[];
  // KPIs für diese Woche
  weeklyPlannedHours: number; // Geplant diese Woche (PLAN)
  totalBudgetHours: number; // Gesamt-SOLL aller Phasen
  totalActualHours: number; // Gesamt-IST aller Phasen (aus Asana)
  remainingHours: number; // Verbleibend (SOLL - IST)
  // Timeline
  timelineStart?: Date;
  timelineEnd?: Date;
  // UI State
  isExpanded: boolean;
  hasActivePhasesThisWeek: boolean;
}

/**
 * Response für projekt-zentrierte Wochendaten.
 */
export interface WeekProjectData {
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
  year: number;

  projectRows: ProjectRowData[];
  poolItems: PoolItem[];
  summary: WeekSummary;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PhaseWithProject {
  id: string;
  name: string;
  bereich: string;
  startDate?: Date;
  endDate?: Date;
  budgetHours?: number;
  plannedHours?: number;
  actualHours?: number;
  project: {
    id: string;
    name: string;
    projectNumber?: string;
    status?: string;
    address?: string;
  };
}

interface AbsenceData {
  userId: string;
  type: string;
  startDate: Date;
  endDate: Date;
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
    private readonly absenceRepository: IAbsenceRepository,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectRepository?: IProjectRepository
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
    const [users, allUsers, phases, absences] = await Promise.all([
      userIds.length > 0 ? this.userRepository.findByIds(userIds) : Promise.resolve([]),
      this.userRepository.findActiveByTenant(tenantId),
      phaseIds.length > 0
        ? this.projectPhaseRepository.findByIdsWithProject(phaseIds)
        : Promise.resolve([]),
      userIds.length > 0
        ? this.absenceRepository.findByUsersAndDateRange(userIds, monday, friday)
        : Promise.resolve([]),
    ]);

    // 4. Lookup-Maps erstellen
    const userMap = new Map(users.map((u: User) => [u.id, u]));
    const phaseMap = new Map(
      (phases as PhaseWithProject[]).map((p) => [p.id, p])
    );
    const absenceMap = this.buildAbsenceMap(absences as AbsenceData[]);

    // 5. Tagesweise Daten aufbauen
    const days: DayData[] = weekDates.map((date, index) => {
      const dateString = formatDateISO(date);
      const dayAllocations = allocations.filter(
        (a) => formatDateISO(a.date) === dateString
      );

      const allocationsWithDetails = dayAllocations.map((alloc) =>
        this.enrichAllocation(alloc, userMap, phaseMap, absenceMap)
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
    absenceMap: Map<string, AbsenceData[]>
  ): AllocationWithDetails {
    const user = alloc.userId ? userMap.get(alloc.userId) : undefined;
    const phase = phaseMap.get(alloc.projectPhaseId);

    // Absence Check
    const dateKey = formatDateISO(alloc.date);
    const userAbsences = alloc.userId ? absenceMap.get(`${alloc.userId}-${dateKey}`) : undefined;
    const hasAbsence = !!userAbsences?.length;

    // Actual Hours - TODO: Aus Asana laden wenn verfügbar
    const actualHours = 0;

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

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT-CENTRIC EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Führt die Query aus und gibt projekt-gruppierte Daten zurück.
   * Diese Methode ist für das neue projekt-zentrierte Planungs-Grid gedacht.
   *
   * @example
   * ```typescript
   * const data = await query.executeProjectCentric({
   *   tenantId: 'tenant-123',
   *   weekStart: new Date('2026-02-02'),
   * });
   * // data.projectRows enthält Projekte mit Phasen und Allocations
   * // data.poolItems enthält Mitarbeiter/Ressourcen mit Verfügbarkeit
   * ```
   */
  async executeProjectCentric(request: GetAllocationsForWeekRequest): Promise<WeekProjectData> {
    const { tenantId, weekStart } = request;
    const monday = getMonday(weekStart);
    const friday = getFriday(weekStart);
    const weekDates = getWeekDates(weekStart);

    // 1. Basis-Daten laden (wie in execute())
    const allocations = await this.allocationRepository.findByTenantAndDateRange(
      tenantId,
      monday,
      friday,
      { projectId: request.projectId, userId: request.userId }
    );

    // 2. IDs sammeln für zusätzliche Daten
    const userIds = [...new Set(allocations.filter((a) => a.userId).map((a) => a.userId!))];

    // 3. Verknüpfte Entitäten laden (zuerst alle User für Absenzen)
    const allUsers = await this.userRepository.findActiveByTenant(tenantId);
    const allUserIds = allUsers.map((u) => u.id);

    // 4. WICHTIG: Alle Phasen im Zeitraum laden, nicht nur die mit Allocations
    const [users, phases, absences] = await Promise.all([
      userIds.length > 0 ? this.userRepository.findByIds(userIds) : Promise.resolve([]),
      this.projectPhaseRepository.findByTenantAndDateRange(tenantId, monday, friday),
      this.absenceRepository.findByUsersAndDateRange(allUserIds, monday, friday),
    ]);

    // 4. Lookup-Maps erstellen
    const userMap = new Map(users.map((u: User) => [u.id, u]));
    const phaseMap = new Map((phases as PhaseWithProject[]).map((p) => [p.id, p]));
    const absenceMap = this.buildAbsenceMap(absences as AbsenceData[]);

    // 5. Allocations mit Details anreichern
    const enrichedAllocations = allocations.map((alloc) =>
      this.enrichAllocation(alloc, userMap, phaseMap, absenceMap)
    );

    // 6. Projekt-Zeilen aufbauen
    const projectRows = this.buildProjectRows(
      enrichedAllocations,
      phases as PhaseWithProject[],
      weekDates
    );

    // 7. Pool-Items aufbauen (Mitarbeiter mit Verfügbarkeit)
    const poolItems = this.buildPoolItems(
      allUsers,
      enrichedAllocations,
      absenceMap,
      weekDates
    );

    // 8. Summary berechnen
    const days = this.buildDaysFromAllocations(enrichedAllocations, weekDates, allUsers);
    const summary = this.calculateWeekSummary(days, allUsers, phases as PhaseWithProject[]);

    return {
      weekStart: monday,
      weekEnd: friday,
      calendarWeek: getCalendarWeek(monday),
      year: monday.getFullYear(),
      projectRows,
      poolItems,
      summary,
    };
  }

  /**
   * Baut Projekt-Zeilen aus den Allocations auf.
   */
  private buildProjectRows(
    allocations: AllocationWithDetails[],
    phases: PhaseWithProject[],
    weekDates: Date[]
  ): ProjectRowData[] {
    // Projekte aus Phasen extrahieren
    const projectMap = new Map<string, {
      project: PhaseWithProject['project'];
      phases: PhaseWithProject[];
      allocations: AllocationWithDetails[];
    }>();

    // Phasen nach Projekt gruppieren
    for (const phase of phases) {
      const existing = projectMap.get(phase.project.id);
      if (existing) {
        existing.phases.push(phase);
      } else {
        projectMap.set(phase.project.id, {
          project: phase.project,
          phases: [phase],
          allocations: [],
        });
      }
    }

    // Allocations den Projekten zuordnen
    for (const alloc of allocations) {
      const phase = phases.find((p) => p.id === alloc.projectPhase.id);
      if (phase) {
        const projectData = projectMap.get(phase.project.id);
        if (projectData) {
          projectData.allocations.push(alloc);
        }
      }
    }

    // ProjectRowData erstellen
    const rows: ProjectRowData[] = [];

    for (const [, data] of projectMap) {
      // Phasen-Zeilen aufbauen
      const phaseRows: PhaseRowData[] = data.phases.map((phase) => {
        // Allocations für diese Phase gruppiert nach Tag
        const phaseAllocations = data.allocations.filter(
          (a) => a.projectPhase.id === phase.id
        );
        const dayAllocations: Record<string, AllocationWithDetails[]> = {};

        for (const date of weekDates) {
          const dateKey = formatDateISO(date);
          dayAllocations[dateKey] = phaseAllocations.filter(
            (a) => formatDateISO(a.date) === dateKey
          );
        }

        // Ist Phase in dieser Woche aktiv?
        const isActiveThisWeek = this.isPhaseActiveInWeek(phase, weekDates);

        return {
          phase: {
            id: phase.id,
            name: phase.name,
            bereich: phase.bereich as PhaseBereich,
            startDate: phase.startDate,
            endDate: phase.endDate,
            budgetHours: phase.budgetHours,
            plannedHours: phase.plannedHours,
            actualHours: phase.actualHours,
          },
          dayAllocations,
          isActiveThisWeek,
        };
      });

      // KPIs berechnen
      const weeklyPlannedHours = data.allocations.reduce(
        (sum, a) => sum + (a.plannedHours ?? 0),
        0
      );
      const totalBudgetHours = data.phases.reduce(
        (sum, p) => sum + (p.budgetHours ?? 0),
        0
      );
      const totalActualHours = data.phases.reduce(
        (sum, p) => sum + (p.actualHours ?? 0),
        0
      );
      const remainingHours = totalBudgetHours - totalActualHours;

      // Timeline aus Phasen berechnen
      const phaseDates = data.phases
        .flatMap((p) => [p.startDate, p.endDate])
        .filter((d): d is Date => d !== undefined);
      const timelineStart = phaseDates.length > 0
        ? new Date(Math.min(...phaseDates.map((d) => d.getTime())))
        : undefined;
      const timelineEnd = phaseDates.length > 0
        ? new Date(Math.max(...phaseDates.map((d) => d.getTime())))
        : undefined;

      // Hat das Projekt aktive Phasen diese Woche?
      const hasActivePhasesThisWeek = phaseRows.some((p) => p.isActiveThisWeek);

      rows.push({
        project: {
          id: data.project.id,
          name: data.project.name,
          status: (data.project.status ?? 'active') as ProjectStatus,
          address: data.project.address,
        },
        phases: phaseRows,
        weeklyPlannedHours,
        totalBudgetHours,
        totalActualHours,
        remainingHours,
        timelineStart,
        timelineEnd,
        // Standardmäßig aufgeklappt wenn aktive Phasen vorhanden
        isExpanded: hasActivePhasesThisWeek,
        hasActivePhasesThisWeek,
      });
    }

    // Nach Projektname sortieren
    return rows.sort((a, b) => a.project.name.localeCompare(b.project.name, 'de'));
  }

  /**
   * Prüft ob eine Phase in der aktuellen Woche aktiv ist.
   */
  private isPhaseActiveInWeek(phase: PhaseWithProject, weekDates: Date[]): boolean {
    if (!phase.startDate && !phase.endDate) return true;

    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];

    // Phase überlappt mit Woche wenn:
    // - Keine Enddatum oder Enddatum >= Wochenstart
    // - Keine Startdatum oder Startdatum <= Wochenende
    const phaseEndOk = !phase.endDate || phase.endDate >= weekStart;
    const phaseStartOk = !phase.startDate || phase.startDate <= weekEnd;

    return phaseEndOk && phaseStartOk;
  }

  /**
   * Baut Pool-Items für alle Mitarbeiter mit deren Verfügbarkeit.
   */
  private buildPoolItems(
    users: User[],
    allocations: AllocationWithDetails[],
    absenceMap: Map<string, AbsenceData[]>,
    weekDates: Date[]
  ): PoolItem[] {
    return users.map((user) => {
      const availability: DayAvailability[] = weekDates.map((date) => {
        const dateKey = formatDateISO(date);
        const userAbsences = absenceMap.get(`${user.id}-${dateKey}`) ?? [];
        const dayAllocations = allocations.filter(
          (a) => a.user?.id === user.id && formatDateISO(a.date) === dateKey
        );

        let status: AvailabilityStatus;
        if (userAbsences.length > 0) {
          status = 'absence';
        } else if (dayAllocations.length === 0) {
          status = 'available';
        } else {
          // Prüfe ob noch Kapazität übrig
          const plannedHours = dayAllocations.reduce(
            (sum, a) => sum + (a.plannedHours ?? 0),
            0
          );
          const dailyCapacity = user.weeklyHours / 5;
          status = plannedHours >= dailyCapacity ? 'busy' : 'partial';
        }

        return {
          date,
          status,
          allocationsCount: dayAllocations.length,
        };
      });

      // Abwesenheits-Label erstellen
      const absenceDays = availability
        .filter((a) => a.status === 'absence')
        .map((a) => this.getWeekdayShort(a.date));
      const hasAbsence = absenceDays.length > 0;
      const absenceLabel = hasAbsence
        ? absenceDays.length === 5
          ? 'Ganze Woche'
          : absenceDays.join('-')
        : undefined;

      return {
        type: 'user' as const,
        id: user.id,
        name: user.fullName,
        role: user.role === 'admin' ? 'Administrator' : user.role === 'planer' ? 'Planer' : 'Mitarbeiter',
        weeklyHours: user.weeklyHours,
        availability,
        hasAbsence,
        absenceLabel,
      };
    });
  }

  /**
   * Gibt den Kurzform des Wochentags zurück.
   */
  private getWeekdayShort(date: Date): string {
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[date.getDay()];
  }

  /**
   * Baut DayData-Array aus Allocations (für Summary-Berechnung).
   */
  private buildDaysFromAllocations(
    allocations: AllocationWithDetails[],
    weekDates: Date[],
    users: User[]
  ): DayData[] {
    const totalCapacity = this.calculateDailyCapacity(users);

    return weekDates.map((date, index) => {
      const dateKey = formatDateISO(date);
      const dayAllocations = allocations.filter(
        (a) => formatDateISO(a.date) === dateKey
      );

      const totalPlannedHours = dayAllocations.reduce(
        (sum, a) => sum + (a.plannedHours ?? 0),
        0
      );
      const totalActualHours = dayAllocations.reduce(
        (sum, a) => sum + a.actualHours,
        0
      );

      return {
        date,
        dayOfWeek: index,
        isToday: isToday(date),
        allocations: dayAllocations,
        totalPlannedHours,
        totalActualHours,
        totalCapacity,
        utilizationPercent:
          totalCapacity > 0 ? Math.round((totalPlannedHours / totalCapacity) * 100) : 0,
      };
    });
  }
}
