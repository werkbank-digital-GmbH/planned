import { ValidationError } from '@/domain/errors';

/**
 * Props für die Erstellung einer Allocation
 */
export interface CreateAllocationProps {
  id: string;
  tenantId: string;
  userId?: string;
  resourceId?: string;
  projectPhaseId: string;
  date: Date;
  plannedHours?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Allocation Entity (Zuweisung)
 *
 * Repräsentiert die Zuweisung einer Person ODER Ressource zu einer Phase
 * an einem bestimmten Tag.
 *
 * WICHTIGE REGELN:
 * - Eine Allocation ist TAGESBASIERT (ein Tag, kein Bereich)
 * - ENTWEDER userId ODER resourceId (XOR, niemals beide)
 * - Resources haben keine plannedHours
 * - PlannedHours werden automatisch verteilt bei Mehrfach-Zuweisung
 *
 * @example
 * ```typescript
 * // User-Allocation
 * const userAllocation = Allocation.create({
 *   id: 'uuid',
 *   tenantId: 'tenant-uuid',
 *   userId: 'user-uuid',
 *   projectPhaseId: 'phase-uuid',
 *   date: new Date('2026-02-05'),
 *   plannedHours: 8,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 *
 * // Resource-Allocation (Fahrzeug)
 * const resourceAllocation = Allocation.create({
 *   id: 'uuid',
 *   tenantId: 'tenant-uuid',
 *   resourceId: 'resource-uuid',
 *   projectPhaseId: 'phase-uuid',
 *   date: new Date('2026-02-05'),
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class Allocation {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly userId: string | undefined,
    public readonly resourceId: string | undefined,
    public readonly projectPhaseId: string,
    public readonly date: Date,
    public readonly plannedHours: number | undefined,
    public readonly notes: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use Allocation.create()
  }

  /**
   * Erstellt eine neue Allocation-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn die Eingabedaten ungültig sind
   */
  static create(props: CreateAllocationProps): Allocation {
    // REGEL 3: User XOR Resource
    Allocation.validateUserOrResource(props.userId, props.resourceId);

    // Date validieren
    Allocation.validateDate(props.date);

    // PlannedHours nur für User (Resources haben keine Stunden)
    const plannedHours = props.resourceId ? undefined : props.plannedHours;

    return new Allocation(
      props.id,
      props.tenantId,
      props.userId,
      props.resourceId,
      props.projectPhaseId,
      props.date,
      plannedHours,
      props.notes?.trim(),
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Ist dies eine User-Allocation?
   */
  get isUserAllocation(): boolean {
    return !!this.userId;
  }

  /**
   * Ist dies eine Resource-Allocation?
   */
  get isResourceAllocation(): boolean {
    return !!this.resourceId;
  }

  /**
   * Gibt das Datum als ISO-String (YYYY-MM-DD) zurück.
   */
  get dateString(): string {
    return this.date.toISOString().split('T')[0];
  }

  /**
   * Erstellt eine Kopie mit neuen plannedHours.
   * Nur für User-Allocations erlaubt.
   *
   * @throws {ValidationError} Wenn es eine Resource-Allocation ist
   * @throws {ValidationError} Wenn die Stunden negativ sind
   */
  withPlannedHours(hours: number): Allocation {
    if (this.isResourceAllocation) {
      throw new ValidationError('Resources haben keine plannedHours', {
        field: 'plannedHours',
      });
    }

    if (hours < 0) {
      throw new ValidationError('PlannedHours dürfen nicht negativ sein', {
        field: 'plannedHours',
        value: hours,
      });
    }

    return new Allocation(
      this.id,
      this.tenantId,
      this.userId,
      this.resourceId,
      this.projectPhaseId,
      this.date,
      hours,
      this.notes,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Erstellt eine Kopie mit neuen Notes.
   */
  withNotes(notes: string): Allocation {
    return new Allocation(
      this.id,
      this.tenantId,
      this.userId,
      this.resourceId,
      this.projectPhaseId,
      this.date,
      this.plannedHours,
      notes.trim(),
      this.createdAt,
      new Date()
    );
  }

  /**
   * Erstellt eine Kopie mit neuem Datum.
   *
   * @throws {ValidationError} Wenn das Datum ungültig ist
   */
  withDate(date: Date): Allocation {
    Allocation.validateDate(date);

    return new Allocation(
      this.id,
      this.tenantId,
      this.userId,
      this.resourceId,
      this.projectPhaseId,
      date,
      this.plannedHours,
      this.notes,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Validiert die XOR-Regel: User ODER Resource, nicht beide, nicht keines.
   */
  private static validateUserOrResource(
    userId: string | undefined,
    resourceId: string | undefined
  ): void {
    if (userId && resourceId) {
      throw new ValidationError('Allocation kann nicht User UND Resource haben', {
        fields: ['userId', 'resourceId'],
      });
    }

    if (!userId && !resourceId) {
      throw new ValidationError('Allocation braucht User ODER Resource', {
        fields: ['userId', 'resourceId'],
      });
    }
  }

  /**
   * Validiert das Datum.
   */
  private static validateDate(date: Date): void {
    if (!date || isNaN(date.getTime())) {
      throw new ValidationError('Gültiges Datum erforderlich', {
        field: 'date',
      });
    }
  }
}
