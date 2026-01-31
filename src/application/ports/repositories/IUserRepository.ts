import type { User } from '@/domain/entities/User';
import type { UserRole } from '@/domain/types';

/**
 * User mit Tenant-Daten (für GetCurrentUserWithTenant)
 */
export interface UserWithTenant {
  id: string;
  authId: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive: boolean;
  avatarUrl?: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Repository Interface für User-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseUserRepository).
 * Die Application-Schicht kennt nur dieses Interface, nicht die Implementierung.
 */
export interface IUserRepository {
  /**
   * Findet einen User anhand seiner ID.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Findet mehrere User anhand ihrer IDs.
   */
  findByIds(ids: string[]): Promise<User[]>;

  /**
   * Findet einen User anhand seiner Supabase Auth ID.
   */
  findByAuthId(authId: string): Promise<User | null>;

  /**
   * Findet einen User anhand seiner Auth ID und lädt die Tenant-Daten mit.
   * Wird für den aktuell eingeloggten User verwendet.
   */
  findByAuthIdWithTenant(authId: string): Promise<UserWithTenant | null>;

  /**
   * Findet einen User anhand seiner E-Mail-Adresse innerhalb eines Tenants.
   */
  findByEmailAndTenant(email: string, tenantId: string): Promise<User | null>;

  /**
   * Findet alle User eines Tenants.
   */
  findAllByTenant(tenantId: string): Promise<User[]>;

  /**
   * Findet alle aktiven User eines Tenants.
   */
  findActiveByTenant(tenantId: string): Promise<User[]>;

  /**
   * Speichert einen neuen User.
   */
  save(user: User): Promise<User>;

  /**
   * Aktualisiert einen bestehenden User.
   */
  update(user: User): Promise<User>;

  /**
   * Löscht einen User (Hard Delete).
   * Normalerweise wird stattdessen deactivate() verwendet.
   */
  delete(id: string): Promise<void>;

  /**
   * Findet alle User eines Tenants die eine TimeTac-ID haben.
   * Wird für TimeTac-Sync verwendet.
   */
  findByTenantWithTimetacId(
    tenantId: string
  ): Promise<Array<{ id: string; timetacId: string }>>;

  /**
   * Aktualisiert die TimeTac-ID eines Users.
   */
  updateTimetacId(userId: string, timetacId: string | null): Promise<void>;
}
