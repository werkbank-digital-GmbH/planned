import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CreateMappingInput,
  IIntegrationMappingRepository,
  IntegrationMappingEntity,
} from '@/application/ports/repositories/IIntegrationMappingRepository';

import type { Database } from '@/lib/database.types';

type MappingRow = Database['public']['Tables']['integration_mappings']['Row'];

// ═══════════════════════════════════════════════════════════════════════════
// MAPPER
// ═══════════════════════════════════════════════════════════════════════════

function mapToDomain(row: MappingRow): IntegrationMappingEntity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    service: row.service as 'timetac' | 'asana',
    mappingType: row.mapping_type as 'project' | 'phase' | 'user',
    externalId: row.external_id,
    internalId: row.internal_id,
    externalName: row.external_name ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supabase-Implementierung des IIntegrationMappingRepository.
 *
 * Speichert Zuordnungen zwischen externen System-IDs und Planned-IDs.
 */
export class SupabaseIntegrationMappingRepository
  implements IIntegrationMappingRepository
{
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<IntegrationMappingEntity | null> {
    const { data, error } = await this.supabase
      .from('integration_mappings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return mapToDomain(data);
  }

  async findByExternalId(
    tenantId: string,
    service: string,
    mappingType: string,
    externalId: string
  ): Promise<IntegrationMappingEntity | null> {
    const { data, error } = await this.supabase
      .from('integration_mappings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('service', service)
      .eq('mapping_type', mappingType)
      .eq('external_id', externalId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapToDomain(data);
  }

  async findByTenantAndType(
    tenantId: string,
    service: string,
    mappingType: string
  ): Promise<IntegrationMappingEntity[]> {
    const { data, error } = await this.supabase
      .from('integration_mappings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('service', service)
      .eq('mapping_type', mappingType)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Mappings laden fehlgeschlagen: ${error.message}`);
    }

    return (data ?? []).map(mapToDomain);
  }

  async upsert(input: CreateMappingInput): Promise<IntegrationMappingEntity> {
    const { data, error } = await this.supabase
      .from('integration_mappings')
      .upsert(
        {
          tenant_id: input.tenantId,
          service: input.service,
          mapping_type: input.mappingType,
          external_id: input.externalId,
          internal_id: input.internalId,
          external_name: input.externalName,
        },
        {
          onConflict: 'tenant_id,service,mapping_type,external_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Mapping speichern fehlgeschlagen: ${error.message}`);
    }

    return mapToDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('integration_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Mapping löschen fehlgeschlagen: ${error.message}`);
    }
  }

  async deleteByType(
    tenantId: string,
    service: string,
    mappingType: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('integration_mappings')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('service', service)
      .eq('mapping_type', mappingType);

    if (error) {
      throw new Error(`Mappings löschen fehlgeschlagen: ${error.message}`);
    }
  }

  async getAsMap(
    tenantId: string,
    service: string,
    mappingType: string
  ): Promise<Map<string, string>> {
    const mappings = await this.findByTenantAndType(tenantId, service, mappingType);

    return new Map(mappings.map((m) => [m.externalId, m.internalId]));
  }
}
