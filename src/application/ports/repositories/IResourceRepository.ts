import type { Resource } from '@/domain/entities/Resource';

/**
 * Repository Interface für Resource-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseResourceRepository).
 */
export interface IResourceRepository {
  /**
   * Findet eine Resource anhand ihrer ID.
   */
  findById(id: string): Promise<Resource | null>;

  /**
   * Findet alle Resources eines Tenants.
   */
  findByTenant(tenantId: string): Promise<Resource[]>;

  /**
   * Findet alle aktiven Resources eines Tenants.
   */
  findActiveByTenant(tenantId: string): Promise<Resource[]>;

  /**
   * Findet alle Resources eines bestimmten Typs.
   */
  findByResourceType(resourceTypeId: string): Promise<Resource[]>;

  /**
   * Findet alle aktiven Resources eines bestimmten Typs.
   */
  findActiveByResourceType(resourceTypeId: string): Promise<Resource[]>;

  /**
   * Findet eine Resource anhand ihres Namens (für Duplikat-Prüfung).
   */
  findByTenantAndName(tenantId: string, name: string): Promise<Resource | null>;

  /**
   * Speichert eine neue Resource.
   */
  save(resource: Resource): Promise<Resource>;

  /**
   * Aktualisiert eine Resource.
   */
  update(resource: Resource): Promise<Resource>;

  /**
   * Löscht eine Resource.
   * In der Regel sollte stattdessen deactivate verwendet werden.
   */
  delete(id: string): Promise<void>;

  /**
   * Prüft ob Allocations für diese Resource existieren.
   */
  hasAllocations(resourceId: string): Promise<boolean>;
}
