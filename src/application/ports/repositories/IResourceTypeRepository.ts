import type { ResourceType } from '@/domain/entities/ResourceType';

/**
 * Repository Interface für ResourceType-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseResourceTypeRepository).
 */
export interface IResourceTypeRepository {
  /**
   * Findet einen ResourceType anhand seiner ID.
   */
  findById(id: string): Promise<ResourceType | null>;

  /**
   * Findet alle ResourceTypes eines Tenants.
   */
  findByTenant(tenantId: string): Promise<ResourceType[]>;

  /**
   * Findet einen ResourceType anhand seines Namens (für Duplikat-Prüfung).
   */
  findByTenantAndName(tenantId: string, name: string): Promise<ResourceType | null>;

  /**
   * Speichert einen neuen ResourceType.
   */
  save(resourceType: ResourceType): Promise<ResourceType>;

  /**
   * Aktualisiert einen ResourceType.
   */
  update(resourceType: ResourceType): Promise<ResourceType>;

  /**
   * Löscht einen ResourceType.
   * @throws Error wenn noch Resources mit diesem Type existieren
   */
  delete(id: string): Promise<void>;

  /**
   * Prüft ob Resources mit diesem ResourceType existieren.
   */
  hasResources(resourceTypeId: string): Promise<boolean>;
}
