import { DomainError } from './DomainError';

/**
 * Wird geworfen wenn eine Entität nicht gefunden wurde.
 *
 * @example
 * const user = await repository.findById(id);
 * if (!user) {
 *   throw new NotFoundError('User', id);
 * }
 */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entityName: string, id: string) {
    super(`${entityName} mit ID ${id} nicht gefunden`, {
      entityType: entityName,
      entityId: id,
    });
  }
}
