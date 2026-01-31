import type { Absence } from '@/domain/entities/Absence';
import type { Allocation } from '@/domain/entities/Allocation';
import type { User } from '@/domain/entities/User';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IProjectPhaseRepository } from '@/application/ports/repositories/IProjectPhaseRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

import { formatDateISO, getFriday, getMonday, getWeekDates } from '@/lib/date-utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request für GetDashboardData
 */
export interface GetDashboardDataRequest {
  tenantId: string;
  /** Optional: Spezifische Woche, default: aktuelle Woche */
  weekStart?: Date;
}

/**
 * Tagesauslastung
 */
export interface DayUtilization {
  date: Date;
  dayName: string;
  capacity: number;
  planned: number;
  utilizationPercent: number;
}

/**
 * Team-Kapazitäts-Metriken
 */
export interface TeamCapacityMetrics {
  activeUsers: number;
  weeklyCapacity: number;
  plannedHours: number;
  freeCapacity: number;
  utilizationPercent: number;
}

/**
 * Projekt-Zusammenfassung für Dashboard
 */
export interface DashboardProjectSummary {
  id: string;
  name: string;
  hoursThisWeek: number;
  phaseName?: string;
}

/**
 * Abwesenheits-Zusammenfassung
 */
export interface AbsenceSummary {
  id: string;
  userName: string;
  type: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Dashboard-Daten
 */
export interface DashboardData {
  weeklyUtilization: DayUtilization[];
  teamCapacity: TeamCapacityMetrics;
  topProjects: DashboardProjectSummary[];
  upcomingAbsences: AbsenceSummary[];
  weekStart: Date;
  weekEnd: Date;
  calendarWeek: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Query: GetDashboardData
 *
 * Lädt alle Daten für das Dashboard:
 * - Wochen-Auslastung (Mo-Fr)
 * - Team-Kapazität
 * - Top 5 Projekte nach Stunden
 * - Bevorstehende Abwesenheiten
 *
 * @example
 * ```typescript
 * const data = await query.execute({ tenantId: 'tenant-123' });
 * // data.weeklyUtilization: 5 Tage mit Kapazität/Geplant
 * // data.teamCapacity: { activeUsers, weeklyCapacity, ... }
 * ```
 */
export class GetDashboardDataQuery {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly absenceRepository: IAbsenceRepository,
    private readonly projectPhaseRepository: IProjectPhaseRepository
  ) {}

  async execute(request: GetDashboardDataRequest): Promise<DashboardData> {
    const { tenantId, weekStart: requestedWeekStart } = request;
    const weekStart = getMonday(requestedWeekStart ?? new Date());
    const weekEnd = getFriday(weekStart);

    // Parallel laden
    const [users, allocations, absences] = await Promise.all([
      this.userRepository.findActiveByTenant(tenantId),
      this.allocationRepository.findByTenantAndDateRange(tenantId, weekStart, weekEnd),
      this.absenceRepository.findByTenantAndDateRange(tenantId, weekStart, weekEnd),
    ]);

    // Weekly Utilization berechnen
    const weeklyUtilization = this.calculateWeeklyUtilization(weekStart, users, allocations);

    // Team Capacity berechnen
    const teamCapacity = this.calculateTeamCapacity(users, allocations);

    // Top Projects
    const topProjects = await this.getTopProjects(allocations);

    // Upcoming Absences
    const upcomingAbsences = this.formatAbsences(absences, users);

    // Kalenderwoche berechnen
    const calendarWeek = this.getCalendarWeek(weekStart);

    return {
      weeklyUtilization,
      teamCapacity,
      topProjects,
      upcomingAbsences,
      weekStart,
      weekEnd,
      calendarWeek,
    };
  }

  private calculateWeeklyUtilization(
    weekStart: Date,
    users: User[],
    allocations: Allocation[]
  ): DayUtilization[] {
    const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const weekDates = getWeekDates(weekStart);
    const dailyCapacity = users.reduce((sum, u) => sum + u.weeklyHours / 5, 0);

    return weekDates.map((date, index) => {
      const dateString = formatDateISO(date);
      const dayAllocations = allocations.filter(
        (a) => formatDateISO(a.date) === dateString
      );
      const planned = dayAllocations.reduce((sum, a) => sum + (a.plannedHours ?? 0), 0);

      return {
        date,
        dayName: dayNames[index],
        capacity: Math.round(dailyCapacity),
        planned: Math.round(planned),
        utilizationPercent:
          dailyCapacity > 0 ? Math.round((planned / dailyCapacity) * 100) : 0,
      };
    });
  }

  private calculateTeamCapacity(users: User[], allocations: Allocation[]): TeamCapacityMetrics {
    const weeklyCapacity = users.reduce((sum, u) => sum + u.weeklyHours, 0);
    const plannedHours = allocations.reduce((sum, a) => sum + (a.plannedHours ?? 0), 0);
    const freeCapacity = weeklyCapacity - plannedHours;

    return {
      activeUsers: users.length,
      weeklyCapacity: Math.round(weeklyCapacity),
      plannedHours: Math.round(plannedHours),
      freeCapacity: Math.round(freeCapacity),
      utilizationPercent:
        weeklyCapacity > 0 ? Math.round((plannedHours / weeklyCapacity) * 100) : 0,
    };
  }

  private async getTopProjects(allocations: Allocation[]): Promise<DashboardProjectSummary[]> {
    // Gruppieren nach Phase
    const phaseHours = new Map<string, number>();
    for (const alloc of allocations) {
      const current = phaseHours.get(alloc.projectPhaseId) || 0;
      phaseHours.set(alloc.projectPhaseId, current + (alloc.plannedHours ?? 0));
    }

    // Sortieren und Top 5
    const sorted = [...phaseHours.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Phasen mit Projekt-Details laden
    const phaseIds = sorted.map(([phaseId]) => phaseId);
    const phasesWithProjects = await this.projectPhaseRepository.findByIdsWithProject(phaseIds);

    const phaseMap = new Map(
      phasesWithProjects.map((p) => [p.id, p])
    );

    const summaries: DashboardProjectSummary[] = [];
    for (const [phaseId, hours] of sorted) {
      const phase = phaseMap.get(phaseId);
      if (phase) {
        summaries.push({
          id: phase.project.id,
          name: phase.project.name,
          phaseName: phase.name,
          hoursThisWeek: Math.round(hours),
        });
      }
    }

    return summaries;
  }

  private formatAbsences(absences: Absence[], users: User[]): AbsenceSummary[] {
    const userMap = new Map(users.map((u) => [u.id, u]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return absences
      .filter((a) => a.endDate >= today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        userName: userMap.get(a.userId)?.fullName || 'Unbekannt',
        type: a.type,
        startDate: a.startDate,
        endDate: a.endDate,
      }));
  }

  private getCalendarWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
    const week1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7
      )
    );
  }
}
