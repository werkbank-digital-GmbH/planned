import type { AbsenceType, ConflictResolution } from '@/lib/database.types';

/**
 * Domain representation of an absence conflict.
 */
export interface AbsenceConflictEntity {
  id: string;
  tenantId: string;
  allocationId: string;
  absenceId: string;
  userId: string;
  date: Date;
  absenceType: AbsenceType;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: ConflictResolution;
  createdAt: Date;
}

/**
 * Conflict with user info for UI display.
 */
export interface AbsenceConflictWithUser extends AbsenceConflictEntity {
  userName: string;
}

/**
 * Input for creating a new conflict.
 */
export interface CreateConflictInput {
  tenantId: string;
  allocationId: string;
  absenceId: string;
  userId: string;
  date: Date;
  absenceType: AbsenceType;
}

/**
 * Repository Interface für AbsenceConflict-Operationen.
 *
 * Verwaltet die Konflikte zwischen Allocations und Abwesenheiten.
 */
export interface IAbsenceConflictRepository {
  /**
   * Findet einen Konflikt anhand seiner ID.
   */
  findById(id: string): Promise<AbsenceConflictEntity | null>;

  /**
   * Findet einen Konflikt anhand von Allocation und Absence.
   * Wird für Duplikat-Prüfung verwendet.
   */
  findByAllocationAndAbsence(
    allocationId: string,
    absenceId: string
  ): Promise<AbsenceConflictEntity | null>;

  /**
   * Findet alle ungelösten Konflikte eines Tenants.
   */
  findUnresolvedByTenant(tenantId: string): Promise<AbsenceConflictWithUser[]>;

  /**
   * Findet alle Konflikte einer Absence.
   */
  findByAbsenceId(absenceId: string): Promise<AbsenceConflictEntity[]>;

  /**
   * Findet alle Konflikte einer Allocation.
   */
  findByAllocationId(allocationId: string): Promise<AbsenceConflictEntity[]>;

  /**
   * Zählt ungelöste Konflikte eines Tenants.
   */
  countUnresolvedByTenant(tenantId: string): Promise<number>;

  /**
   * Speichert einen neuen Konflikt.
   */
  save(conflict: CreateConflictInput): Promise<AbsenceConflictEntity>;

  /**
   * Speichert mehrere Konflikte.
   */
  saveMany(conflicts: CreateConflictInput[]): Promise<AbsenceConflictEntity[]>;

  /**
   * Löst einen Konflikt.
   */
  resolve(
    id: string,
    resolution: ConflictResolution,
    resolvedBy: string
  ): Promise<AbsenceConflictEntity>;

  /**
   * Löscht alle Konflikte einer Absence.
   * Wird aufgerufen wenn die Absence gelöscht wird.
   */
  deleteByAbsenceId(absenceId: string): Promise<void>;

  /**
   * Löscht alle Konflikte einer Allocation.
   * Wird aufgerufen wenn die Allocation gelöscht wird.
   */
  deleteByAllocationId(allocationId: string): Promise<void>;
}
