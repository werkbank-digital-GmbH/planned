import type { User } from '@/domain/entities/User';
import { AuthorizationError } from '@/domain/errors';
import type { UserRole } from '@/domain/types';

import type { IUserRepository } from '@/application/ports/repositories';

/**
 * Request für das Laden aller User eines Tenants
 */
export interface GetUsersRequest {
  /** Tenant-ID */
  tenantId: string;
  /** Rolle des aktuellen Users (für Berechtigungsprüfung) */
  currentUserRole: UserRole;
  /** Optional: Nur aktive User laden */
  activeOnly?: boolean;
}

/**
 * Use Case: Mitarbeiter-Liste laden
 *
 * Lädt alle Mitarbeiter eines Tenants.
 * Nur Admin und Planer haben Zugriff.
 *
 * @example
 * ```typescript
 * const useCase = new GetUsersUseCase(userRepository);
 * const users = await useCase.execute({
 *   tenantId: 'tenant-123',
 *   currentUserRole: 'admin',
 *   activeOnly: true,
 * });
 * ```
 */
export class GetUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(request: GetUsersRequest): Promise<User[]> {
    // 1. Berechtigungsprüfung: Nur Admin und Planer dürfen alle User sehen
    if (request.currentUserRole === 'gewerblich') {
      throw new AuthorizationError('Keine Berechtigung, die Mitarbeiterliste einzusehen');
    }

    // 2. User laden
    if (request.activeOnly) {
      return this.userRepository.findActiveByTenant(request.tenantId);
    }

    return this.userRepository.findAllByTenant(request.tenantId);
  }
}
