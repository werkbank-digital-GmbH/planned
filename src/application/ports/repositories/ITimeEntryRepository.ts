import type { TimeEntry } from '@/domain/entities/TimeEntry';

/**
 * Repository Interface für TimeEntry-Operationen.
 *
 * TimeEntries kommen NUR aus TimeTac - es gibt KEIN manuelles CRUD!
 * Der Sync nutzt findByTimeTacId und saveMany mit Upsert.
 */
export interface ITimeEntryRepository {
  /**
   * Findet einen TimeEntry anhand seiner ID.
   */
  findById(id: string): Promise<TimeEntry | null>;

  /**
   * Findet einen TimeEntry anhand der TimeTac-ID.
   * Wichtig für Duplikat-Erkennung beim Sync.
   */
  findByTimeTacId(timetacId: string, tenantId: string): Promise<TimeEntry | null>;

  /**
   * Findet alle TimeEntries eines Users in einem Zeitraum.
   */
  findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]>;

  /**
   * Findet alle TimeEntries mehrerer User in einem Zeitraum.
   * Batch-Operation für Performance.
   */
  findByUserIdsAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; date: Date; hours: number }>>;

  /**
   * Findet alle TimeEntries einer Phase.
   */
  findByPhase(phaseId: string): Promise<TimeEntry[]>;

  /**
   * Findet alle TimeEntries eines Tenants in einem Zeitraum.
   */
  findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]>;

  /**
   * Summiert die Stunden aller TimeEntries einer Phase.
   * Wird für die Berechnung von project_phases.actual_hours verwendet.
   */
  sumHoursByPhase(phaseId: string): Promise<number>;

  /**
   * Speichert einen TimeEntry.
   */
  save(entry: TimeEntry): Promise<TimeEntry>;

  /**
   * Speichert mehrere TimeEntries mit Upsert.
   * Bei Konflikt auf timetac_id + tenant_id wird aktualisiert.
   */
  saveMany(entries: TimeEntry[]): Promise<TimeEntry[]>;

  /**
   * Upsert basierend auf TimeTac-ID (für Sync).
   */
  upsertByTimeTacId(entry: TimeEntry): Promise<TimeEntry>;
}
