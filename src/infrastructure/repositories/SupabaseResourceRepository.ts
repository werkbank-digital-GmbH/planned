import type { SupabaseClient } from '@supabase/supabase-js';

import type { Resource } from '@/domain/entities/Resource';

import type { IResourceRepository } from '@/application/ports/repositories';

import { ResourceMapper } from '@/infrastructure/mappers/ResourceMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des IResourceRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseResourceRepository implements IResourceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Resource | null> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return ResourceMapper.toDomain(data);
  }

  async findByTenant(tenantId: string): Promise<Resource[]> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error || !data) {
      return [];
    }

    return ResourceMapper.toDomainList(data);
  }

  async findActiveByTenant(tenantId: string): Promise<Resource[]> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error || !data) {
      return [];
    }

    return ResourceMapper.toDomainList(data);
  }

  async findByResourceType(resourceTypeId: string): Promise<Resource[]> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('resource_type_id', resourceTypeId)
      .order('name');

    if (error || !data) {
      return [];
    }

    return ResourceMapper.toDomainList(data);
  }

  async findActiveByResourceType(resourceTypeId: string): Promise<Resource[]> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('resource_type_id', resourceTypeId)
      .eq('is_active', true)
      .order('name');

    if (error || !data) {
      return [];
    }

    return ResourceMapper.toDomainList(data);
  }

  async findByTenantAndName(tenantId: string, name: string): Promise<Resource | null> {
    const { data, error } = await this.supabase
      .from('resources')
      .select('*')
      .eq('tenant_id', tenantId)
      .ilike('name', name)
      .single();

    if (error || !data) {
      return null;
    }

    return ResourceMapper.toDomain(data);
  }

  async save(resource: Resource): Promise<Resource> {
    const { data, error } = await this.supabase
      .from('resources')
      .insert(ResourceMapper.toPersistence(resource))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Resource: ${error?.message}`);
    }

    return ResourceMapper.toDomain(data);
  }

  async update(resource: Resource): Promise<Resource> {
    const { data, error } = await this.supabase
      .from('resources')
      .update({
        resource_type_id: resource.resourceTypeId,
        name: resource.name,
        license_plate: resource.licensePlate ?? null,
        is_active: resource.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resource.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren der Resource: ${error?.message}`);
    }

    return ResourceMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    // Prüfe zuerst ob Allocations existieren
    const hasAllocations = await this.hasAllocations(id);
    if (hasAllocations) {
      throw new Error('Resource kann nicht gelöscht werden, da noch Allocations existieren');
    }

    const { error } = await this.supabase.from('resources').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen der Resource: ${error.message}`);
    }
  }

  async hasAllocations(resourceId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('allocations')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId);

    if (error) {
      return false;
    }

    return (count ?? 0) > 0;
  }
}
