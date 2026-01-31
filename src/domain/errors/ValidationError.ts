import { DomainError } from './DomainError';

/**
 * Wird geworfen wenn Eingabedaten nicht valide sind.
 *
 * @example
 * if (!email.includes('@')) {
 *   throw new ValidationError('E-Mail ist ungültig', { field: 'email' });
 * }
 */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
