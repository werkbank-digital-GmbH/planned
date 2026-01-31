import type { SupabaseClient } from '@supabase/supabase-js';

import type { ResourceType } from '@/domain/entities/ResourceType';

import type { IResourceTypeRepository } from '@/application/ports/repositories';

import { ResourceTypeMapper } from '@/infrastructure/mappers/ResourceTypeMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des IResourceTypeRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseResourceTypeRepository implements IResourceTypeRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<ResourceType | null> {
    const { data, error } = await this.supabase
      .from('resource_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return ResourceTypeMapper.toDomain(data);
  }

  async findByTenant(tenantId: string): Promise<ResourceType[]> {
    const { data, error } = await this.supabase
      .from('resource_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');

    if (error || !data) {
      return [];
    }

    return ResourceTypeMapper.toDomainList(data);
  }

  async findByTenantAndName(tenantId: string, name: string): Promise<ResourceType | null> {
    const { data, error } = await this.supabase
      .from('resource_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('name', name)
      .single();

    if (error || !data) {
      return null;
    }

    return ResourceTypeMapper.toDomain(data);
  }

  async save(resourceType: ResourceType): Promise<ResourceType> {
    const { data, error } = await this.supabase
      .from('resource_types')
      .insert(ResourceTypeMapper.toPersistence(resourceType))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern des ResourceType: ${error?.message}`);
    }

    return ResourceTypeMapper.toDomain(data);
  }

  async update(resourceType: ResourceType): Promise<ResourceType> {
    const { data, error } = await this.supabase
      .from('resource_types')
      .update({
        name: resourceType.name,
        icon: resourceType.icon ?? null,
        color: resourceType.color ?? null,
        sort_order: resourceType.sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceType.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren des ResourceType: ${error?.message}`);
    }

    return ResourceTypeMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    // Prüfe zuerst ob Resources existieren
    const hasResources = await this.hasResources(id);
    if (hasResources) {
      throw new Error('ResourceType kann nicht gelöscht werden, da noch Resources existieren');
    }

    const { error } = await this.supabase.from('resource_types').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen des ResourceType: ${error.message}`);
    }
  }

  async hasResources(resourceTypeId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('resource_type_id', resourceTypeId);

    if (error) {
      return false;
    }

    return (count ?? 0) > 0;
  }
}
