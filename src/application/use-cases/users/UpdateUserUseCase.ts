import type { User } from '@/domain/entities/User';
import { AuthorizationError, NotFoundError } from '@/domain/errors';
import type { UserRole } from '@/domain/types';

import type { IUserRepository } from '@/application/ports/repositories';

/**
 * Request für das Aktualisieren eines Users
 */
export interface UpdateUserRequest {
  /** ID des zu aktualisierenden Users */
  userId: string;
  /** Tenant-ID (für Sicherheitsprüfung) */
  tenantId: string;
  /** Rolle des aktuellen Users (für Berechtigungsprüfung) */
  currentUserRole: UserRole;
  /** Neuer Name (optional) */
  fullName?: string;
  /** Neue Rolle (optional) */
  role?: UserRole;
  /** Neue Wochenstunden (optional) */
  weeklyHours?: number;
}

/**
 * Use Case: Mitarbeiter aktualisieren
 *
 * Aktualisiert die Daten eines bestehenden Users.
 * Nur Admins dürfen User bearbeiten.
 *
 * @example
 * ```typescript
 * const useCase = new UpdateUserUseCase(userRepository);
 * const user = await useCase.execute({
 *   userId: 'user-123',
 *   tenantId: 'tenant-123',
 *   currentUserRole: 'admin',
 *   fullName: 'Neuer Name',
 *   weeklyHours: 32,
 * });
 * ```
 */
export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(request: UpdateUserRequest): Promise<User> {
    // 1. Berechtigungsprüfung: Nur Admins dürfen User bearbeiten
    if (request.currentUserRole !== 'admin') {
      throw new AuthorizationError('Nur Administratoren dürfen Mitarbeiter bearbeiten');
    }

    // 2. User laden
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new NotFoundError('Mitarbeiter', request.userId);
    }

    // 3. Tenant-Prüfung: User muss zum gleichen Tenant gehören
    if (user.tenantId !== request.tenantId) {
      throw new NotFoundError('Mitarbeiter', request.userId);
    }

    // 4. Updates anwenden (mit Validierung durch Entity-Methoden)
    let updatedUser = user;

    if (request.fullName !== undefined) {
      updatedUser = updatedUser.updateProfile({ fullName: request.fullName });
    }

    if (request.role !== undefined) {
      updatedUser = updatedUser.updateRole(request.role);
    }

    if (request.weeklyHours !== undefined) {
      updatedUser = updatedUser.updateWeeklyHours(request.weeklyHours);
    }

    // 5. Speichern
    const savedUser = await this.userRepository.update(updatedUser);

    return savedUser;
  }
}
