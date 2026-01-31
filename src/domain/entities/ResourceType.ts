import { ValidationError } from '@/domain/errors';

/**
 * Props für die Erstellung eines ResourceType
 */
export interface CreateResourceTypeProps {
  id: string;
  tenantId: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ResourceType Entity (Ressourcen-Kategorie)
 *
 * Definiert eine Kategorie von Ressourcen (z.B. Fahrzeug, Maschine).
 * Jeder Tenant kann eigene ResourceTypes definieren.
 *
 * @example
 * ```typescript
 * const type = ResourceType.create({
 *   id: 'uuid',
 *   tenantId: 'tenant-uuid',
 *   name: 'Fahrzeug',
 *   icon: '🚗',
 *   color: '#3B82F6',
 *   sortOrder: 1,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class ResourceType {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly icon: string | undefined,
    public readonly color: string | undefined,
    public readonly sortOrder: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use ResourceType.create()
  }

  /**
   * Erstellt eine neue ResourceType-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn der Name leer ist
   */
  static create(props: CreateResourceTypeProps): ResourceType {
    ResourceType.validateName(props.name);

    return new ResourceType(
      props.id,
      props.tenantId,
      props.name.trim(),
      props.icon,
      props.color,
      props.sortOrder,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Aktualisiert den Namen.
   */
  withName(name: string): ResourceType {
    ResourceType.validateName(name);

    return new ResourceType(
      this.id,
      this.tenantId,
      name.trim(),
      this.icon,
      this.color,
      this.sortOrder,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert das Icon.
   */
  withIcon(icon: string | undefined): ResourceType {
    return new ResourceType(
      this.id,
      this.tenantId,
      this.name,
      icon,
      this.color,
      this.sortOrder,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Farbe.
   */
  withColor(color: string | undefined): ResourceType {
    return new ResourceType(
      this.id,
      this.tenantId,
      this.name,
      this.icon,
      color,
      this.sortOrder,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert die Sortierreihenfolge.
   */
  withSortOrder(sortOrder: number): ResourceType {
    return new ResourceType(
      this.id,
      this.tenantId,
      this.name,
      this.icon,
      this.color,
      sortOrder,
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
