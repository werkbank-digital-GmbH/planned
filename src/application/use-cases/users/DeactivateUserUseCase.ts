import type { User } from '@/domain/entities/User';
import { AuthorizationError, NotFoundError, ValidationError } from '@/domain/errors';
import type { UserRole } from '@/domain/types';

import type { IUserRepository } from '@/application/ports/repositories';
import type { IAuthService } from '@/application/ports/services';

/**
 * Request für das Deaktivieren eines Users
 */
export interface DeactivateUserRequest {
  /** ID des zu deaktivierenden Users */
  userId: string;
  /** Tenant-ID (für Sicherheitsprüfung) */
  tenantId: string;
  /** Rolle des aktuellen Users (für Berechtigungsprüfung) */
  currentUserRole: UserRole;
  /** ID des aktuellen Users (um Selbst-Deaktivierung zu verhindern) */
  currentUserId: string;
}

/**
 * Use Case: Mitarbeiter deaktivieren
 *
 * Deaktiviert einen User (Soft-Delete).
 * Der User kann sich nicht mehr einloggen, seine Allocations bleiben erhalten.
 * Nur Admins dürfen User deaktivieren.
 *
 * @example
 * ```typescript
 * const useCase = new DeactivateUserUseCase(userRepository, authService);
 * const user = await useCase.execute({
 *   userId: 'user-123',
 *   tenantId: 'tenant-123',
 *   currentUserRole: 'admin',
 *   currentUserId: 'admin-user-id',
 * });
 * ```
 */
export class DeactivateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(request: DeactivateUserRequest): Promise<User> {
    // 1. Berechtigungsprüfung: Nur Admins dürfen User deaktivieren
    if (request.currentUserRole !== 'admin') {
      throw new AuthorizationError('Nur Administratoren dürfen Mitarbeiter deaktivieren');
    }

    // 2. Selbst-Deaktivierung verhindern
    if (request.currentUserId === request.userId) {
      throw new ValidationError('Sie können sich nicht selbst deaktivieren', {
        field: 'userId',
      });
    }

    // 3. User laden
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new NotFoundError('Mitarbeiter', request.userId);
    }

    // 4. Tenant-Prüfung: User muss zum gleichen Tenant gehören
    if (user.tenantId !== request.tenantId) {
      throw new NotFoundError('Mitarbeiter', request.userId);
    }

    // 5. Wenn bereits deaktiviert, einfach zurückgeben
    if (!user.isActive) {
      return user;
    }

    // 6. Auth-User deaktivieren (verhindert Login)
    await this.authService.disableUser(user.authId);

    // 7. User deaktivieren und speichern
    const deactivatedUser = user.deactivate();
    const savedUser = await this.userRepository.update(deactivatedUser);

    return savedUser;
  }
}
