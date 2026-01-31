/**
 * Integration Mapping Entity
 */
export interface IntegrationMappingEntity {
  id: string;
  tenantId: string;
  service: 'timetac' | 'asana';
  mappingType: 'project' | 'phase' | 'user';
  externalId: string;
  internalId: string;
  externalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Input für Integration Mapping
 */
export interface CreateMappingInput {
  tenantId: string;
  service: 'timetac' | 'asana';
  mappingType: 'project' | 'phase' | 'user';
  externalId: string;
  internalId: string;
  externalName?: string;
}

/**
 * Repository Interface für Integration Mappings.
 *
 * Speichert Zuordnungen zwischen externen System-IDs und Planned-IDs.
 * Beispiel: TimeTac Projekt 123 -> Planned Phase abc-def
 */
export interface IIntegrationMappingRepository {
  /**
   * Findet ein Mapping anhand seiner ID.
   */
  findById(id: string): Promise<IntegrationMappingEntity | null>;

  /**
   * Findet ein Mapping anhand der externen ID.
   */
  findByExternalId(
    tenantId: string,
    service: string,
    mappingType: string,
    externalId: string
  ): Promise<IntegrationMappingEntity | null>;

  /**
   * Findet alle Mappings eines Typs für einen Tenant.
   */
  findByTenantAndType(
    tenantId: string,
    service: string,
    mappingType: string
  ): Promise<IntegrationMappingEntity[]>;

  /**
   * Erstellt oder aktualisiert ein Mapping.
   */
  upsert(input: CreateMappingInput): Promise<IntegrationMappingEntity>;

  /**
   * Löscht ein Mapping.
   */
  delete(id: string): Promise<void>;

  /**
   * Löscht alle Mappings eines Typs.
   */
  deleteByType(tenantId: string, service: string, mappingType: string): Promise<void>;

  /**
   * Lädt alle Mappings als Map für schnellen Lookup.
   * Key: externalId, Value: internalId
   */
  getAsMap(
    tenantId: string,
    service: string,
    mappingType: string
  ): Promise<Map<string, string>>;
}
