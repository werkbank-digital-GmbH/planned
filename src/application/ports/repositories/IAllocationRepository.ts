import type { Allocation } from '@/domain/entities/Allocation';

/**
 * Allocation mit optionaler Abwesenheits-Warnung
 */
export interface AllocationWithWarning {
  allocation: Allocation;
  hasAbsenceWarning: boolean;
  absenceType?: string;
}

/**
 * Repository Interface für Allocation-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseAllocationRepository).
 */
export interface IAllocationRepository {
  /**
   * Findet eine Allocation anhand ihrer ID.
   */
  findById(id: string): Promise<Allocation | null>;

  /**
   * Findet alle Allocations eines Users an einem bestimmten Tag.
   */
  findByUserAndDate(userId: string, date: Date): Promise<Allocation[]>;

  /**
   * Findet alle Allocations einer Resource an einem bestimmten Tag.
   */
  findByResourceAndDate(resourceId: string, date: Date): Promise<Allocation[]>;

  /**
   * Findet alle Allocations einer Phase in einem Zeitraum.
   */
  findByPhaseAndDateRange(
    phaseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]>;

  /**
   * Findet alle Allocations eines Users in einem Zeitraum.
   */
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]>;

  /**
   * Findet alle Allocations eines Tenants in einem Zeitraum.
   * Optional können Filter nach Projekt oder User angewendet werden.
   */
  findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: { projectId?: string; userId?: string }
  ): Promise<Allocation[]>;

  /**
   * Zählt die Allocations eines Users an einem Tag.
   * Wird für die PlannedHours-Berechnung benötigt.
   */
  countByUserAndDate(userId: string, date: Date): Promise<number>;

  /**
   * Speichert eine neue Allocation.
   */
  save(allocation: Allocation): Promise<Allocation>;

  /**
   * Speichert mehrere Allocations (z.B. bei Bulk-Create).
   */
  saveMany(allocations: Allocation[]): Promise<Allocation[]>;

  /**
   * Aktualisiert eine Allocation.
   */
  update(allocation: Allocation): Promise<Allocation>;

  /**
   * Aktualisiert die plannedHours mehrerer Allocations (für Redistribution).
   */
  updateManyPlannedHours(updates: { id: string; plannedHours: number }[]): Promise<void>;

  /**
   * Löscht eine Allocation.
   */
  delete(id: string): Promise<void>;

  /**
   * Löscht mehrere Allocations.
   */
  deleteMany(ids: string[]): Promise<void>;

  /**
   * Verschiebt eine Allocation zu einem neuen Datum.
   */
  moveToDate(id: string, newDate: Date): Promise<Allocation>;

  /**
   * Verschiebt eine Allocation zu einer neuen Phase.
   */
  moveToPhase(id: string, newPhaseId: string): Promise<Allocation>;
}
