import { DomainError } from './DomainError';

/**
 * Wird geworfen wenn der Benutzer nicht autorisiert ist.
 *
 * @example
 * if (user.role !== 'admin') {
 *   throw new AuthorizationError('Nur Admins dürfen Benutzer löschen');
 * }
 */
export class AuthorizationError extends DomainError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Keine Berechtigung für diese Aktion') {
    super(message);
  }
}
