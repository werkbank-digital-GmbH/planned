import { ValidationError } from '@/domain/errors';
import { type UserRole, hasDesktopAccess } from '@/domain/types';

/** Konstante für Arbeitstage pro Woche */
const WORK_DAYS_PER_WEEK = 5;
/** Minimale Wochenstunden */
const MIN_WEEKLY_HOURS = 0;
/** Maximale Wochenstunden */
const MAX_WEEKLY_HOURS = 60;
/** Regex für E-Mail-Validierung */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Props für die Erstellung eines Users
 */
export interface CreateUserProps {
  id: string;
  authId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive: boolean;
  timetacId?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props für Profil-Update
 */
export interface UpdateProfileProps {
  fullName?: string;
  avatarUrl?: string;
}

/**
 * User Entity (Mitarbeiter)
 *
 * Repräsentiert einen Mitarbeiter im System.
 * Verknüpft mit Supabase Auth via authId.
 *
 * @example
 * ```typescript
 * const user = User.create({
 *   id: 'uuid',
 *   authId: 'supabase-auth-id',
 *   tenantId: 'tenant-uuid',
 *   email: 'max@example.com',
 *   fullName: 'Max Müller',
 *   role: 'planer',
 *   weeklyHours: 40,
 *   isActive: true,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * });
 * ```
 */
export class User {
  private constructor(
    public readonly id: string,
    public readonly authId: string,
    public readonly tenantId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly role: UserRole,
    public readonly weeklyHours: number,
    public readonly isActive: boolean,
    public readonly timetacId: string | undefined,
    public readonly avatarUrl: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    // Private constructor - use User.create()
  }

  /**
   * Erstellt eine neue User-Instanz mit Validierung.
   *
   * @throws {ValidationError} Wenn die Eingabedaten ungültig sind
   */
  static create(props: CreateUserProps): User {
    // Validate email
    User.validateEmail(props.email);

    // Validate fullName
    User.validateFullName(props.fullName);

    // Validate weeklyHours
    User.validateWeeklyHours(props.weeklyHours);

    return new User(
      props.id,
      props.authId,
      props.tenantId,
      props.email.toLowerCase().trim(),
      props.fullName.trim(),
      props.role,
      props.weeklyHours,
      props.isActive,
      props.timetacId,
      props.avatarUrl,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Deaktiviert den User (Soft-Delete).
   * Gibt eine neue User-Instanz zurück (Immutability).
   */
  deactivate(): User {
    return new User(
      this.id,
      this.authId,
      this.tenantId,
      this.email,
      this.fullName,
      this.role,
      this.weeklyHours,
      false,
      this.timetacId,
      this.avatarUrl,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktiviert den User.
   * Gibt eine neue User-Instanz zurück (Immutability).
   */
  activate(): User {
    return new User(
      this.id,
      this.authId,
      this.tenantId,
      this.email,
      this.fullName,
      this.role,
      this.weeklyHours,
      true,
      this.timetacId,
      this.avatarUrl,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Ändert die Rolle des Users.
   * Gibt eine neue User-Instanz zurück (Immutability).
   */
  updateRole(newRole: UserRole): User {
    return new User(
      this.id,
      this.authId,
      this.tenantId,
      this.email,
      this.fullName,
      newRole,
      this.weeklyHours,
      this.isActive,
      this.timetacId,
      this.avatarUrl,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Ändert die Wochenstunden des Users.
   * Gibt eine neue User-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn die Stunden ungültig sind
   */
  updateWeeklyHours(newWeeklyHours: number): User {
    User.validateWeeklyHours(newWeeklyHours);

    return new User(
      this.id,
      this.authId,
      this.tenantId,
      this.email,
      this.fullName,
      this.role,
      newWeeklyHours,
      this.isActive,
      this.timetacId,
      this.avatarUrl,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Aktualisiert das Profil (Name und/oder Avatar).
   * Gibt eine neue User-Instanz zurück (Immutability).
   *
   * @throws {ValidationError} Wenn der neue Name ungültig ist
   */
  updateProfile(props: UpdateProfileProps): User {
    const newFullName = props.fullName !== undefined ? props.fullName : this.fullName;
    const newAvatarUrl = props.avatarUrl !== undefined ? props.avatarUrl : this.avatarUrl;

    if (props.fullName !== undefined) {
      User.validateFullName(props.fullName);
    }

    return new User(
      this.id,
      this.authId,
      this.tenantId,
      this.email,
      newFullName.trim(),
      this.role,
      this.weeklyHours,
      this.isActive,
      this.timetacId,
      newAvatarUrl,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Berechnet die täglichen Arbeitsstunden (weeklyHours / 5).
   */
  getDailyHours(): number {
    return this.weeklyHours / WORK_DAYS_PER_WEEK;
  }

  /**
   * Prüft, ob der User Zugriff auf Desktop-Routen hat.
   * Nur Admin und Planer haben Desktop-Zugriff.
   */
  hasDesktopAccess(): boolean {
    return hasDesktopAccess(this.role);
  }

  /**
   * Prüft, ob der User ein Administrator ist.
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Validiert die E-Mail-Adresse.
   */
  private static validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new ValidationError('E-Mail ist erforderlich', { field: 'email' });
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new ValidationError('E-Mail-Format ist ungültig', {
        field: 'email',
      });
    }
  }

  /**
   * Validiert den vollständigen Namen.
   */
  private static validateFullName(fullName: string): void {
    if (!fullName || fullName.trim().length === 0) {
      throw new ValidationError('Name ist erforderlich', { field: 'fullName' });
    }
  }

  /**
   * Validiert die Wochenstunden.
   */
  private static validateWeeklyHours(weeklyHours: number): void {
    if (weeklyHours < MIN_WEEKLY_HOURS || weeklyHours > MAX_WEEKLY_HOURS) {
      throw new ValidationError(
        `Wochenstunden müssen zwischen ${MIN_WEEKLY_HOURS} und ${MAX_WEEKLY_HOURS} liegen`,
        { field: 'weeklyHours', value: weeklyHours }
      );
    }
  }
}
