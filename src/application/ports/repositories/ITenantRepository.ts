import type { Tenant } from '@/domain/entities/Tenant';

/**
 * Repository Interface für Tenant-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseTenantRepository).
 * Die Application-Schicht kennt nur dieses Interface, nicht die Implementierung.
 */
export interface ITenantRepository {
  /**
   * Findet einen Tenant anhand seiner ID.
   */
  findById(id: string): Promise<Tenant | null>;

  /**
   * Findet einen Tenant anhand seines Slugs.
   */
  findBySlug(slug: string): Promise<Tenant | null>;

  /**
   * Speichert einen neuen Tenant.
   */
  save(tenant: Tenant): Promise<Tenant>;

  /**
   * Aktualisiert einen bestehenden Tenant.
   */
  update(tenant: Tenant): Promise<Tenant>;
}
