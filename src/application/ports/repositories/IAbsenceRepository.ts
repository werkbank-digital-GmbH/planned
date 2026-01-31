import type { Absence } from '@/domain/entities/Absence';

/**
 * Repository Interface für Absence-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseAbsenceRepository).
 */
export interface IAbsenceRepository {
  /**
   * Findet eine Absence anhand ihrer ID.
   */
  findById(id: string): Promise<Absence | null>;

  /**
   * Findet alle Absences eines Users.
   */
  findByUser(userId: string): Promise<Absence[]>;

  /**
   * Findet alle Absences eines Users in einem Zeitraum.
   * Wird für Konflikt-Erkennung verwendet.
   */
  findByUserAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<Absence[]>;

  /**
   * Findet alle Absences mehrerer User in einem Zeitraum.
   * Batch-Operation für Performance.
   */
  findByUsersAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; type: string; startDate: Date; endDate: Date }>>;

  /**
   * Findet alle Absences eines Tenants in einem Zeitraum.
   */
  findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Absence[]>;

  /**
   * Findet Absence anhand der TimeTac-ID (für Sync).
   */
  findByTimetacId(timetacId: string): Promise<Absence | null>;

  /**
   * Speichert eine neue Absence.
   */
  save(absence: Absence): Promise<Absence>;

  /**
   * Aktualisiert eine Absence.
   */
  update(absence: Absence): Promise<Absence>;

  /**
   * Löscht eine Absence.
   */
  delete(id: string): Promise<void>;

  /**
   * Upsert basierend auf TimeTac-ID (für Sync).
   */
  upsertByTimetacId(absence: Absence): Promise<Absence>;
}
