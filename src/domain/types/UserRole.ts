/**
 * Benutzerrollen im System
 *
 * - admin: Geschäftsführung, IT (alle Rechte)
 * - planer: Produktions-/Montageleiter (Planungsrechte)
 * - gewerblich: Zimmerer, Monteure (nur Leserechte, Mobile)
 */
export type UserRole = 'admin' | 'planer' | 'gewerblich';

/**
 * Alle verfügbaren Benutzerrollen
 */
export const USER_ROLES: readonly UserRole[] = [
  'admin',
  'planer',
  'gewerblich',
] as const;

/**
 * Deutsche Bezeichnungen für Benutzerrollen
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  planer: 'Planer',
  gewerblich: 'Gewerblich',
};

/**
 * Prüft, ob ein Wert eine gültige UserRole ist
 */
export function isValidUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    USER_ROLES.includes(value as UserRole)
  );
}

/**
 * Rollen, die Zugriff auf Desktop-Routen haben
 */
export const DESKTOP_ROLES: readonly UserRole[] = ['admin', 'planer'] as const;

/**
 * Prüft, ob eine Rolle Zugriff auf Desktop-Routen hat
 */
export function hasDesktopAccess(role: UserRole): boolean {
  return DESKTOP_ROLES.includes(role);
}
