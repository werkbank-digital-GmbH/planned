import { ValidationError } from '@/domain/errors';
import {
  type PhaseBereich,
  type PhaseStatus,
  isValidPhaseBereich,
  isValidPhaseStatus,
  PHASE_BEREICH_LABELS,
} from '@/domain/types';

/**
 * Props für die Erstellung einer ProjectPhase
 */
export interface CreateProjectPhaseProps {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  bereich: PhaseBereich;
  startDate?: Date;
  endDate?: Date;
  sortOrder: number;
  budgetHours?: number;
  plannedHours?: number;
  actualHours?: number;
  status?: PhaseStatus;
  asanaGid?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProjectPhase Entity (Arbeitspaket)
 *
 * Repräsentiert eine Phase/Arbeitspaket eines Bauprojekts.
 * Phasen werden aus Asana synchronisiert.
 *
 * SOLL/PLAN/IST Stunden:
 * - SOLL (budgetHours): Kommt aus Asana Custom Field
 * - PLAN (plannedHours): Summe der Allocations (via DB-Trigger)
 * - IST (actualHours): Summe der TimeEntries (via DB-Trigger)
 *
 * @example
 * ```typescript
 * const phase = ProjectPhase.create({
 *   id: 'uuid',
 *   projectId: 'project-uuid',
 *   tenantId: 'tenant-uuid',
 *   name: 'Elementierung',
 *   bereich: 'produktion',
 *   sortOrder: 1,
 *   budgetHours: 40,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class ProjectPhase {
  private constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly bereich: PhaseBereich,
    public readonly startDate: Date | undefined,
    public readonly endDate: Date | undefined,
    public readonly sortOrder: number,
    public readonly budgetHours: number | undefined,
    public readonly plannedHours: number,
    public readonly actualHours: number,
    public readonly status: PhaseStatus,
    public readonly asanaGid: string | undefined,
    public readonly deletedAt: Date | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use ProjectPhase.create()
  }

  /**
   * Erstellt eine neue ProjectPhase-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn die Eingabedaten ungültig sind
   */
  static create(props: CreateProjectPhaseProps): ProjectPhase {
    // Validate name
    ProjectPhase.validateName(props.name);

    // Validate bereich
    ProjectPhase.validateBereich(props.bereich);

    // Validate dates
    if (props.startDate && props.endDate) {
      ProjectPhase.validateDates(props.startDate, props.endDate);
    }

    return new ProjectPhase(
      props.id,
      props.projectId,
      props.tenantId,
      props.name.trim(),
      props.bereich,
      props.startDate,
      props.endDate,
      props.sortOrder,
      props.budgetHours,
      props.plannedHours ?? 0,
      props.actualHours ?? 0,
      props.status ?? 'active',
      props.asanaGid,
      props.deletedAt,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Ändert den Status der Phase.
   * Gibt eine neue ProjectPhase-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn der Status ungültig ist
   */
  withStatus(status: PhaseStatus): ProjectPhase {
    ProjectPhase.validateStatus(status);

    return new ProjectPhase(
      this.id,
      this.projectId,
      this.tenantId,
      this.name,
      this.bereich,
      this.startDate,
      this.endDate,
      this.sortOrder,
      this.budgetHours,
      this.plannedHours,
      this.actualHours,
      status,
      this.asanaGid,
      status === 'deleted' ? new Date() : undefined,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Datumswerte.
   * Gibt eine neue ProjectPhase-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn endDate vor startDate liegt
   */
  withDates(startDate: Date | undefined, endDate: Date | undefined): ProjectPhase {
    if (startDate && endDate) {
      ProjectPhase.validateDates(startDate, endDate);
    }

    return new ProjectPhase(
      this.id,
      this.projectId,
      this.tenantId,
      this.name,
      this.bereich,
      startDate,
      endDate,
      this.sortOrder,
      this.budgetHours,
      this.plannedHours,
      this.actualHours,
      this.status,
      this.asanaGid,
      this.deletedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Budget-Stunden (SOLL).
   * Gibt eine neue ProjectPhase-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn budgetHours negativ ist
   */
  withBudgetHours(budgetHours: number | undefined): ProjectPhase {
    if (budgetHours !== undefined && budgetHours < 0) {
      throw new ValidationError('Budget-Stunden dürfen nicht negativ sein', {
        field: 'budgetHours',
        value: budgetHours,
      });
    }

    return new ProjectPhase(
      this.id,
      this.projectId,
      this.tenantId,
      this.name,
      this.bereich,
      this.startDate,
      this.endDate,
      this.sortOrder,
      budgetHours,
      this.plannedHours,
      this.actualHours,
      this.status,
      this.asanaGid,
      this.deletedAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Auslastung in Prozent (IST / SOLL * 100)
   * Gibt null zurück wenn kein Budget definiert oder 0
   */
  get utilizationPercent(): number | null {
    if (!this.budgetHours || this.budgetHours === 0) return null;
    return Math.round((this.actualHours / this.budgetHours) * 100);
  }

  /**
   * Delta = IST - SOLL
   * Positiv = Überverbrauch, Negativ = Unterverbrauch
   * Gibt null zurück wenn kein Budget definiert
   */
  get delta(): number | null {
    if (this.budgetHours === undefined) return null;
    return this.actualHours - this.budgetHours;
  }

  /**
   * Über Budget wenn IST > SOLL
   */
  get isOverBudget(): boolean {
    if (this.budgetHours === undefined) return false;
    return this.actualHours > this.budgetHours;
  }

  /**
   * Überplanung wenn PLAN > SOLL
   */
  get isOverPlanned(): boolean {
    if (this.budgetHours === undefined) return false;
    return this.plannedHours > this.budgetHours;
  }

  /**
   * UI-Label für Bereich (PRODUKTION / MONTAGE)
   */
  get bereichLabel(): string {
    return PHASE_BEREICH_LABELS[this.bereich];
  }

  /**
   * Ist soft-deleted (status = deleted oder deletedAt gesetzt)
   */
  get isDeleted(): boolean {
    return this.status === 'deleted' || !!this.deletedAt;
  }

  /**
   * Validiert den Phasennamen.
   */
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Phasenname ist erforderlich', { field: 'name' });
    }
  }

  /**
   * Validiert den Bereich.
   */
  private static validateBereich(bereich: string): void {
    if (!isValidPhaseBereich(bereich)) {
      throw new ValidationError(
        'Ungültiger Bereich. Erlaubt: produktion, montage, externes_gewerk',
        {
          field: 'bereich',
          value: bereich,
        }
      );
    }
  }

  /**
   * Validiert den Status.
   */
  private static validateStatus(status: string): void {
    if (!isValidPhaseStatus(status)) {
      throw new ValidationError('Ungültiger Status. Erlaubt: active, deleted', {
        field: 'status',
        value: status,
      });
    }
  }

  /**
   * Validiert die Datumswerte.
   */
  private static validateDates(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new ValidationError('Enddatum muss nach Startdatum liegen', {
        field: 'endDate',
      });
    }
  }
}
