/**
 * Domain Errors
 *
 * Zentrale Exports für alle Domain-Fehler.
 * Diese werden in der Domain- und Application-Schicht verwendet
 * und in der Presentation-Schicht zu ActionResult konvertiert.
 */

export { DomainError } from './DomainError';
export { ValidationError } from './ValidationError';
export { NotFoundError } from './NotFoundError';
export { AuthorizationError } from './AuthorizationError';
export { ConflictError } from './ConflictError';
