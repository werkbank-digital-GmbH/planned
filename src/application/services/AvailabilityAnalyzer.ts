import { eachDayOfInterval, formatISO, isWeekend, startOfDay } from 'date-fns';

import type {
  AvailabilityContext,
  AvailableUser,
  OverloadedUser,
} from '@/domain/analytics/types';
import type { User } from '@/domain/entities/User';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IAllocationRepository } from '@/application/ports/repositories/IAllocationRepository';
import type { IUserRepository } from '@/application/ports/repositories/IUserRepository';

/**
 * Analysiert Mitarbeiter-Verfügbarkeit für Empfehlungen.
 *
 * Dieser Domain Service berechnet, welche Mitarbeiter für einen
 * gegebenen Zeitraum verfügbar sind und wer überlastet ist.
 */
export class AvailabilityAnalyzer {
  private static readonly HOURS_PER_DAY = 8;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly absenceRepository: IAbsenceRepository
  ) {}

  /**
   * Findet verfügbare Mitarbeiter für einen Zeitraum.
   *
   * @param tenantId - Tenant ID
   * @param startDate - Startdatum des Zeitraums
   * @param endDate - Enddatum des Zeitraums
   * @param minAvailableHours - Mindestanzahl freier Stunden (Standard: 8h = 1 Tag)
   * @returns Liste verfügbarer Mitarbeiter, sortiert nach Verfügbarkeit
   */
  async findAvailableUsers(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    minAvailableHours: number = 8
  ): Promise<AvailableUser[]> {
    // 1. Alle aktiven User des Tenants laden
    const users = await this.userRepository.findActiveByTenant(tenantId);
    if (users.length === 0) return [];

    // 2. Arbeitstage im Zeitraum ermitteln
    const workingDays = this.getWorkingDays(startDate, endDate);
    if (workingDays.length === 0) return [];

    // 3. Für jeden User: Allocations + Absences laden
    const userIds = users.map((u) => u.id);

    const [allocations, absences] = await Promise.all([
      this.getAllocationsForUsers(userIds, startDate, endDate),
      this.absenceRepository.findByUsersAndDateRange(userIds, startDate, endDate),
    ]);

    // 4. Verfügbarkeit pro User berechnen
    const availableUsers: AvailableUser[] = [];

    for (const user of users) {
      const userAllocations = allocations.get(user.id) || new Map<string, number>();
      const userAbsences = this.getAbsenceDates(absences, user.id, startDate, endDate);

      const availability = this.calculateUserAvailability(
        user,
        workingDays,
        userAllocations,
        userAbsences
      );

      // Nur User mit genügend freien Stunden zurückgeben
      if (availability.availableHours >= minAvailableHours) {
        availableUsers.push(availability);
      }
    }

    // 5. Sortieren nach Verfügbarkeit (höchste zuerst)
    return availableUsers.sort((a, b) => b.availableHours - a.availableHours);
  }

  /**
   * Findet überlastete Mitarbeiter (> 100% Auslastung) in einem Zeitraum.
   *
   * @param tenantId - Tenant ID
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Liste überlasteter Mitarbeiter
   */
  async findOverloadedUsers(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OverloadedUser[]> {
    const users = await this.userRepository.findActiveByTenant(tenantId);
    if (users.length === 0) return [];

    const workingDays = this.getWorkingDays(startDate, endDate);
    if (workingDays.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const allocations = await this.getAllocationsForUsers(userIds, startDate, endDate);

    const overloadedUsers: OverloadedUser[] = [];
    const expectedHours = workingDays.length * AvailabilityAnalyzer.HOURS_PER_DAY;

    for (const user of users) {
      const userAllocations = allocations.get(user.id) || new Map<string, number>();
      const totalAllocatedHours = Array.from(userAllocations.values()).reduce(
        (sum, h) => sum + h,
        0
      );
      const utilizationPercent = Math.round((totalAllocatedHours / expectedHours) * 100);

      if (utilizationPercent > 100) {
        overloadedUsers.push({
          id: user.id,
          name: user.fullName,
          utilizationPercent,
        });
      }
    }

    return overloadedUsers.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }

  /**
   * Holt den vollständigen Verfügbarkeitskontext für einen Zeitraum.
   */
  async getAvailabilityContext(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilityContext> {
    const [availableUsers, overloadedUsers] = await Promise.all([
      this.findAvailableUsers(tenantId, startDate, endDate),
      this.findOverloadedUsers(tenantId, startDate, endDate),
    ]);

    return { availableUsers, overloadedUsers };
  }

  /**
   * Berechnet die Verfügbarkeit eines einzelnen Users.
   */
  private calculateUserAvailability(
    user: User,
    workingDays: Date[],
    allocations: Map<string, number>, // date ISO string → hours
    absenceDates: Set<string> // date ISO strings
  ): AvailableUser {
    let totalAvailableHours = 0;
    const availableDays: string[] = [];
    let totalAllocatedHours = 0;

    for (const day of workingDays) {
      const dateKey = formatISO(day, { representation: 'date' });

      // Abwesend → keine Verfügbarkeit
      if (absenceDates.has(dateKey)) continue;

      const allocatedHours = allocations.get(dateKey) || 0;
      totalAllocatedHours += allocatedHours;

      const freeHours = Math.max(0, AvailabilityAnalyzer.HOURS_PER_DAY - allocatedHours);

      if (freeHours > 0) {
        totalAvailableHours += freeHours;
        availableDays.push(dateKey);
      }
    }

    const expectedHours = workingDays.length * AvailabilityAnalyzer.HOURS_PER_DAY;
    const currentUtilization =
      expectedHours > 0 ? Math.round((totalAllocatedHours / expectedHours) * 100) : 0;

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      availableDays,
      availableHours: totalAvailableHours,
      currentUtilization,
    };
  }

  /**
   * Ermittelt Arbeitstage (keine Wochenenden) im Zeitraum.
   */
  private getWorkingDays(startDate: Date, endDate: Date): Date[] {
    const allDays = eachDayOfInterval({
      start: startOfDay(startDate),
      end: startOfDay(endDate),
    });
    return allDays.filter((day) => !isWeekend(day));
  }

  /**
   * Lädt Allocations für mehrere User und gruppiert sie.
   */
  private async getAllocationsForUsers(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, Map<string, number>>> {
    const result = new Map<string, Map<string, number>>();

    // Initialisiere leere Maps für alle User
    for (const userId of userIds) {
      result.set(userId, new Map());
    }

    // Lade alle Allocations für alle User im Zeitraum
    for (const userId of userIds) {
      const allocations = await this.allocationRepository.findByUserAndDateRange(
        userId,
        startDate,
        endDate
      );

      const userMap = result.get(userId)!;
      for (const allocation of allocations) {
        const dateKey = formatISO(allocation.date, { representation: 'date' });
        const current = userMap.get(dateKey) || 0;
        userMap.set(dateKey, current + (allocation.plannedHours ?? 0));
      }
    }

    return result;
  }

  /**
   * Extrahiert Abwesenheitsdaten für einen User als Set von ISO-Datumsstrings.
   */
  private getAbsenceDates(
    absences: Array<{ userId: string; startDate: Date; endDate: Date }>,
    userId: string,
    rangeStart: Date,
    rangeEnd: Date
  ): Set<string> {
    const absenceDates = new Set<string>();

    const userAbsences = absences.filter((a) => a.userId === userId);

    for (const absence of userAbsences) {
      // Schnittmenge mit dem abgefragten Zeitraum
      const start = absence.startDate > rangeStart ? absence.startDate : rangeStart;
      const end = absence.endDate < rangeEnd ? absence.endDate : rangeEnd;

      if (start <= end) {
        const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
        for (const day of days) {
          if (!isWeekend(day)) {
            absenceDates.add(formatISO(day, { representation: 'date' }));
          }
        }
      }
    }

    return absenceDates;
  }
}
