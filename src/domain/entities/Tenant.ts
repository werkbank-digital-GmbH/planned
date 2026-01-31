import { ValidationError } from '@/domain/errors';

/**
 * Tenant-Einstellungen (Firmenweite Konfiguration)
 */
export interface TenantSettings {
  /** Standard-Wochenstunden für neue Mitarbeiter (Default: 40) */
  defaultWeeklyHours: number;
  /** URL zum Firmenlogo (optional) */
  logoUrl?: string;
}

/**
 * Props für die Erstellung eines Tenants
 */
export interface CreateTenantProps {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimale Wochenstunden */
const MIN_WEEKLY_HOURS = 0;
/** Maximale Wochenstunden */
const MAX_WEEKLY_HOURS = 60;
/** Regex für gültigen Slug: nur Kleinbuchstaben, Zahlen, Bindestriche */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tenant Entity (Mandant)
 *
 * Repräsentiert eine Firma (Holzbaubetrieb) im System.
 * Alle Daten sind an einen Tenant gebunden (Multi-Tenancy).
 *
 * @example
 * ```typescript
 * const tenant = Tenant.create({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Zimmerei Müller GmbH',
 *   slug: 'zimmerei-mueller',
 *   settings: { defaultWeeklyHours: 40 },
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class Tenant {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly settings: TenantSettings,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use Tenant.create()
  }

  /**
   * Erstellt eine neue Tenant-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn die Eingabedaten ungültig sind
   */
  static create(props: CreateTenantProps): Tenant {
    // Validate name
    Tenant.validateName(props.name);

    // Validate slug
    Tenant.validateSlug(props.slug);

    // Validate settings
    Tenant.validateSettings(props.settings);

    return new Tenant(
      props.id,
      props.name.trim(),
      props.slug,
      { ...props.settings },
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Aktualisiert die Tenant-Einstellungen.
   * Gibt eine neue Tenant-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn die neuen Einstellungen ungültig sind
   */
  updateSettings(newSettings: TenantSettings): Tenant {
    Tenant.validateSettings(newSettings);

    return new Tenant(
      this.id,
      this.name,
      this.slug,
      { ...newSettings },
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert den Firmennamen.
   * Gibt eine neue Tenant-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn der neue Name ungültig ist
   */
  updateName(newName: string): Tenant {
    Tenant.validateName(newName);

    return new Tenant(
      this.id,
      newName.trim(),
      this.slug,
      { ...this.settings },
      this.createdAt,
      new Date()
    );
  }

  /**
   * Validiert den Firmennamen.
   */
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Firmenname ist erforderlich', {
        field: 'name',
      });
    }
  }

  /**
   * Validiert den Slug.
   *
   * Slug-Regeln:
   * - Nur Kleinbuchstaben, Zahlen und Bindestriche
   * - Darf nicht mit Bindestrich beginnen oder enden
   * - Mindestens ein Zeichen
   */
  private static validateSlug(slug: string): void {
    if (!slug || slug.trim().length === 0) {
      throw new ValidationError('Slug ist erforderlich', { field: 'slug' });
    }

    // Check for invalid characters first
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError(
        'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        { field: 'slug' }
      );
    }

    // Check for leading or trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      throw new ValidationError(
        'Slug darf nicht mit einem Bindestrich beginnen oder enden',
        { field: 'slug' }
      );
    }

    // Final pattern check for consecutive hyphens
    if (!SLUG_PATTERN.test(slug)) {
      throw new ValidationError(
        'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten',
        { field: 'slug' }
      );
    }
  }

  /**
   * Validiert die Tenant-Einstellungen.
   */
  private static validateSettings(settings: TenantSettings): void {
    if (
      settings.defaultWeeklyHours < MIN_WEEKLY_HOURS ||
      settings.defaultWeeklyHours > MAX_WEEKLY_HOURS
    ) {
      throw new ValidationError(
        `Wochenstunden müssen zwischen ${MIN_WEEKLY_HOURS} und ${MAX_WEEKLY_HOURS} liegen`,
        { field: 'defaultWeeklyHours', value: settings.defaultWeeklyHours }
      );
    }
  }
}
