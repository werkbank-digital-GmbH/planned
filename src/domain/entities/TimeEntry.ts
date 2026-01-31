import { ValidationError } from '@/domain/errors';

/**
 * Props für die Erstellung eines TimeEntry
 */
export interface CreateTimeEntryProps {
  id?: string;
  tenantId: string;
  userId: string;
  projectPhaseId?: string;
  date: Date;
  hours: number;
  description?: string;
  timetacId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * TimeEntry Entity (IST-Stunden aus TimeTac)
 *
 * Repräsentiert eine erfasste Arbeitszeit aus TimeTac.
 * TimeEntries kommen NUR aus TimeTac und werden NICHT manuell erstellt!
 *
 * Die timetacId ist Pflicht und dient der Duplikat-Erkennung beim Sync.
 *
 * @example
 * ```typescript
 * const entry = TimeEntry.create({
 *   tenantId: 'tenant-uuid',
 *   userId: 'user-uuid',
 *   date: new Date('2026-02-05'),
 *   hours: 8,
 *   timetacId: 'tt-123456',
 * });
 * ```
 */
export class TimeEntry {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly projectPhaseId: string | undefined,
    public readonly date: Date,
    public readonly hours: number,
    public readonly description: string | undefined,
    public readonly timetacId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use TimeEntry.create()
  }

  /**
   * Erstellt eine neue TimeEntry-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn timetacId fehlt
   * @throws {ValidationError} Wenn Stunden ungültig sind
   * @throws {ValidationError} Wenn Datum ungültig ist
   */
  static create(props: CreateTimeEntryProps): TimeEntry {
    TimeEntry.validateTimetacId(props.timetacId);
    TimeEntry.validateHours(props.hours);
    TimeEntry.validateDate(props.date);

    return new TimeEntry(
      props.id ?? crypto.randomUUID(),
      props.tenantId,
      props.userId,
      props.projectPhaseId,
      props.date,
      props.hours,
      props.description?.trim(),
      props.timetacId.trim(),
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date()
    );
  }

  /**
   * Datum als ISO-String (YYYY-MM-DD)
   */
  get dateString(): string {
    return this.date.toISOString().split('T')[0];
  }

  /**
   * Ist einer Phase zugeordnet
   */
  get isAssignedToPhase(): boolean {
    return !!this.projectPhaseId;
  }

  /**
   * Erstellt eine Kopie mit neuer Phase-Zuordnung.
   */
  withPhase(phaseId: string | undefined): TimeEntry {
    return new TimeEntry(
      this.id,
      this.tenantId,
      this.userId,
      phaseId,
      this.date,
      this.hours,
      this.description,
      this.timetacId,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Erstellt eine Kopie mit neuen Stunden.
   *
   * @throws {ValidationError} Wenn Stunden ungültig sind
   */
  withHours(hours: number): TimeEntry {
    TimeEntry.validateHours(hours);

    return new TimeEntry(
      this.id,
      this.tenantId,
      this.userId,
      this.projectPhaseId,
      this.date,
      hours,
      this.description,
      this.timetacId,
      this.createdAt,
      new Date()
    );
  }

  private static validateTimetacId(timetacId: string): void {
    if (!timetacId || timetacId.trim().length === 0) {
      throw new ValidationError('TimeTac-ID ist erforderlich', { field: 'timetacId' });
    }
  }

  private static validateHours(hours: number): void {
    if (hours < 0 || hours > 24) {
      throw new ValidationError('Stunden müssen zwischen 0 und 24 liegen', { field: 'hours' });
    }
  }

  private static validateDate(date: Date): void {
    if (!date || isNaN(date.getTime())) {
      throw new ValidationError('Gültiges Datum erforderlich', { field: 'date' });
    }
  }
}
