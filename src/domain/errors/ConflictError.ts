import { DomainError } from './DomainError';

/**
 * Wird geworfen wenn ein Konflikt mit bestehenden Daten besteht.
 *
 * @example
 * const existingUser = await repository.findByEmail(email);
 * if (existingUser) {
 *   throw new ConflictError('E-Mail bereits vergeben', { field: 'email' });
 * }
 */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
