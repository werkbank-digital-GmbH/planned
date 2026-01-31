import type { SupabaseClient } from '@supabase/supabase-js';

import type { Project } from '@/domain/entities/Project';
import type { ProjectStatus } from '@/domain/types';

import type { IProjectRepository, ProjectWithPhases } from '@/application/ports/repositories';

import { ProjectMapper } from '@/infrastructure/mappers/ProjectMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des IProjectRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Project | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return ProjectMapper.toDomain(data);
  }

  async findByAsanaGid(gid: string, tenantId: string): Promise<Project | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('asana_gid', gid)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return ProjectMapper.toDomain(data);
  }

  async findAllByTenant(tenantId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error || !data) {
      return [];
    }

    return ProjectMapper.toDomainList(data);
  }

  async findActiveByTenant(tenantId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('name');

    if (error || !data) {
      return [];
    }

    return ProjectMapper.toDomainList(data);
  }

  async findWithPhases(id: string): Promise<ProjectWithPhases | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*, project_phases(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    const project = ProjectMapper.toDomain(data);

    // TODO: ProjectPhaseMapper wird in Prompt 08 implementiert
    // Für jetzt geben wir die rohen Phasen zurück
    return {
      project,
      phases: data.project_phases ?? [],
    };
  }

  async save(project: Project): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .upsert(ProjectMapper.toPersistence(project))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern des Projekts: ${error?.message}`);
    }

    return ProjectMapper.toDomain(data);
  }

  async update(project: Project): Promise<Project> {
    const { data, error } = await this.supabase
      .from('projects')
      .update({
        name: project.name,
        client_name: project.clientName ?? null,
        address: project.address ?? null,
        status: project.status,
        synced_at: project.syncedAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren des Projekts: ${error?.message}`);
    }

    return ProjectMapper.toDomain(data);
  }

  async updateStatus(id: string, status: ProjectStatus): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Aktualisieren des Status: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('projects').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen des Projekts: ${error.message}`);
    }
  }
}
