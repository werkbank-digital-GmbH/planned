import { ValidationError } from '@/domain/errors';

/**
 * Gültige Abwesenheitstypen
 */
export type AbsenceType = 'vacation' | 'sick' | 'holiday' | 'training' | 'other';

const VALID_ABSENCE_TYPES: AbsenceType[] = ['vacation', 'sick', 'holiday', 'training', 'other'];

/**
 * Deutsche Labels für Abwesenheitstypen
 */
export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  holiday: 'Feiertag',
  training: 'Fortbildung',
  other: 'Sonstiges',
};

/**
 * Props für die Erstellung einer Absence
 */
export interface CreateAbsenceProps {
  id?: string;
  tenantId: string;
  userId: string;
  type: AbsenceType;
  startDate: Date;
  endDate: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Absence Entity (Abwesenheit)
 *
 * Repräsentiert eine Abwesenheit eines Mitarbeiters (Urlaub, Krank, etc.).
 * Abwesenheiten können aus Asana importiert oder manuell erfasst werden.
 *
 * Wichtig: Abwesenheiten BLOCKIEREN NICHT, sondern WARNEN nur bei Konflikten.
 *
 * @example
 * ```typescript
 * const absence = Absence.create({
 *   tenantId: 'tenant-uuid',
 *   userId: 'user-uuid',
 *   type: 'vacation',
 *   startDate: new Date('2026-02-05'),
 *   endDate: new Date('2026-02-07'),
 * });
 *
 * // Prüfen ob ein Datum in der Abwesenheit liegt
 * absence.includesDate(new Date('2026-02-06')); // true
 * ```
 */
export class Absence {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly type: AbsenceType,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly notes: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use Absence.create()
  }

  /**
   * Erstellt eine neue Absence-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn Enddatum vor Startdatum liegt
   * @throws {ValidationError} Wenn Abwesenheitstyp ungültig ist
   */
  static create(props: CreateAbsenceProps): Absence {
    Absence.validateType(props.type);
    Absence.validateDateRange(props.startDate, props.endDate);

    return new Absence(
      props.id ?? crypto.randomUUID(),
      props.tenantId,
      props.userId,
      props.type,
      props.startDate,
      props.endDate,
      props.notes?.trim(),
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date()
    );
  }

  /**
   * Anzahl Tage der Abwesenheit (inklusiv Start und Ende)
   */
  get durationDays(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Prüft ob ein Datum innerhalb der Abwesenheit liegt
   */
  includesDate(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
  }

  /**
   * UI-Label für den Abwesenheitstyp
   */
  get typeLabel(): string {
    return ABSENCE_TYPE_LABELS[this.type];
  }

  /**
   * Aktualisiert die Notizen.
   */
  withNotes(notes: string | undefined): Absence {
    return new Absence(
      this.id,
      this.tenantId,
      this.userId,
      this.type,
      this.startDate,
      this.endDate,
      notes?.trim(),
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert den Zeitraum.
   *
   * @throws {ValidationError} Wenn Enddatum vor Startdatum liegt
   */
  withDateRange(startDate: Date, endDate: Date): Absence {
    Absence.validateDateRange(startDate, endDate);

    return new Absence(
      this.id,
      this.tenantId,
      this.userId,
      this.type,
      startDate,
      endDate,
      this.notes,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert den Abwesenheitstyp.
   *
   * @throws {ValidationError} Wenn Typ ungültig ist
   */
  withType(type: AbsenceType): Absence {
    Absence.validateType(type);

    return new Absence(
      this.id,
      this.tenantId,
      this.userId,
      type,
      this.startDate,
      this.endDate,
      this.notes,
      this.createdAt,
      new Date()
    );
  }

  private static validateType(type: AbsenceType): void {
    if (!VALID_ABSENCE_TYPES.includes(type)) {
      throw new ValidationError('Ungültiger Abwesenheitstyp', { field: 'type' });
    }
  }

  private static validateDateRange(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new ValidationError('Enddatum muss nach Startdatum liegen', {
        field: 'endDate',
      });
    }
  }
}
