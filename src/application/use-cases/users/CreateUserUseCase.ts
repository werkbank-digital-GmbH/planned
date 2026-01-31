import { User } from '@/domain/entities/User';
import { AuthorizationError, ConflictError } from '@/domain/errors';
import type { UserRole } from '@/domain/types';

import type { IUserRepository } from '@/application/ports/repositories';
import type { IAuthService } from '@/application/ports/services';

/**
 * Request für das Erstellen eines neuen Users
 */
export interface CreateUserRequest {
  /** E-Mail-Adresse des neuen Users */
  email: string;
  /** Vollständiger Name */
  fullName: string;
  /** Rolle des Users */
  role: UserRole;
  /** Wochenstunden (0-60) */
  weeklyHours: number;
  /** Tenant-ID */
  tenantId: string;
  /** Rolle des aktuellen Users (für Berechtigungsprüfung) */
  currentUserRole: UserRole;
  /** Optional: Redirect-URL nach Registrierung */
  redirectTo?: string;
}

/**
 * Use Case: Neuen Mitarbeiter erstellen
 *
 * Erstellt einen neuen User im System und sendet eine Einladungs-E-Mail.
 * Nur Admins dürfen neue User erstellen.
 *
 * @example
 * ```typescript
 * const useCase = new CreateUserUseCase(userRepository, authService);
 * const user = await useCase.execute({
 *   email: 'max@firma.de',
 *   fullName: 'Max Müller',
 *   role: 'planer',
 *   weeklyHours: 40,
 *   tenantId: 'tenant-123',
 *   currentUserRole: 'admin',
 * });
 * ```
 */
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService
  ) {}

  async execute(request: CreateUserRequest): Promise<User> {
    // 1. Berechtigungsprüfung: Nur Admins dürfen User erstellen
    if (request.currentUserRole !== 'admin') {
      throw new AuthorizationError('Nur Administratoren dürfen Mitarbeiter anlegen');
    }

    // 2. Prüfen ob E-Mail bereits existiert (im selben Tenant)
    const existingUser = await this.userRepository.findByEmailAndTenant(
      request.email.toLowerCase().trim(),
      request.tenantId
    );

    if (existingUser) {
      throw new ConflictError('E-Mail-Adresse bereits vergeben', {
        field: 'email',
        value: request.email,
      });
    }

    // 3. Einladungs-E-Mail senden und Auth-User erstellen
    // Wichtig: Erst Einladung senden, dann User speichern
    // So vermeiden wir verwaiste User-Einträge bei E-Mail-Fehlern
    const authId = await this.authService.inviteUser(request.email, request.redirectTo);

    // 4. User Entity erstellen (mit Validierung)
    const user = User.create({
      id: crypto.randomUUID(),
      authId,
      tenantId: request.tenantId,
      email: request.email,
      fullName: request.fullName,
      role: request.role,
      weeklyHours: request.weeklyHours,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. User speichern
    const savedUser = await this.userRepository.save(user);

    return savedUser;
  }
}
