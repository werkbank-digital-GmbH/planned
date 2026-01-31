import { ValidationError } from '@/domain/errors';

/**
 * Props für die Erstellung einer Resource
 */
export interface CreateResourceProps {
  id: string;
  tenantId: string;
  resourceTypeId: string;
  name: string;
  licensePlate?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resource Entity (Betriebsmittel)
 *
 * Repräsentiert eine Ressource wie Fahrzeug, Maschine, etc.
 * Resources können Allocations zugewiesen werden (alternativ zu Users).
 *
 * @example
 * ```typescript
 * const resource = Resource.create({
 *   id: 'uuid',
 *   tenantId: 'tenant-uuid',
 *   resourceTypeId: 'type-uuid',
 *   name: 'Sprinter 1',
 *   licensePlate: 'B-AB 1234',
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class Resource {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly resourceTypeId: string,
    public readonly name: string,
    public readonly licensePlate: string | undefined,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use Resource.create()
  }

  /**
   * Erstellt eine neue Resource-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn der Name leer ist
   */
  static create(props: CreateResourceProps): Resource {
    Resource.validateName(props.name);

    return new Resource(
      props.id,
      props.tenantId,
      props.resourceTypeId,
      props.name.trim(),
      props.licensePlate?.trim(),
      props.isActive ?? true,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Deaktiviert die Resource.
   * Deaktivierte Resources erscheinen nicht im Pool, aber
   * bestehende Allocations bleiben erhalten.
   */
  deactivate(): Resource {
    return new Resource(
      this.id,
      this.tenantId,
      this.resourceTypeId,
      this.name,
      this.licensePlate,
      false,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktiviert die Resource.
   */
  activate(): Resource {
    return new Resource(
      this.id,
      this.tenantId,
      this.resourceTypeId,
      this.name,
      this.licensePlate,
      true,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert den Namen.
   */
  withName(name: string): Resource {
    Resource.validateName(name);

    return new Resource(
      this.id,
      this.tenantId,
      this.resourceTypeId,
      name.trim(),
      this.licensePlate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert das Kennzeichen.
   */
  withLicensePlate(licensePlate: string | undefined): Resource {
    return new Resource(
      this.id,
      this.tenantId,
      this.resourceTypeId,
      this.name,
      licensePlate?.trim(),
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Ändert den ResourceType.
   */
  withResourceType(resourceTypeId: string): Resource {
    return new Resource(
      this.id,
      this.tenantId,
      resourceTypeId,
      this.name,
      this.licensePlate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name ist erforderlich', { field: 'name' });
    }
  }
}
