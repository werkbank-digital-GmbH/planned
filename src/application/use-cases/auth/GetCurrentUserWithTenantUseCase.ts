import { NotFoundError } from '@/domain/errors';

import type { IUserRepository, UserWithTenant } from '@/application/ports/repositories';

/**
 * Use Case: Aktuellen User mit Tenant-Daten abrufen
 *
 * Wird verwendet, um den aktuell eingeloggten User mit seinen
 * Tenant-Informationen zu laden. Typischerweise nach dem Login
 * oder beim Initialisieren der App.
 *
 * @example
 * ```typescript
 * const useCase = new GetCurrentUserWithTenantUseCase(userRepository);
 * const user = await useCase.execute(authId);
 * console.log(user.tenant.name); // "Zimmerei Müller GmbH"
 * ```
 */
export class GetCurrentUserWithTenantUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Führt den Use Case aus.
   *
   * @param authId - Die Supabase Auth ID des Users
   * @returns User mit Tenant-Daten
   * @throws {NotFoundError} Wenn der User nicht gefunden wurde
   */
  async execute(authId: string): Promise<UserWithTenant> {
    if (!authId || authId.trim().length === 0) {
      throw new NotFoundError('Benutzer', 'unknown');
    }

    const userWithTenant = await this.userRepository.findByAuthIdWithTenant(authId);

    if (!userWithTenant) {
      throw new NotFoundError('Benutzer', authId);
    }

    return userWithTenant;
  }
}
