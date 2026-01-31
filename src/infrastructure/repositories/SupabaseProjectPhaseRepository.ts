import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProjectPhase } from '@/domain/entities/ProjectPhase';
import type { PhaseBereich, PhaseStatus } from '@/domain/types';

import type { IProjectPhaseRepository } from '@/application/ports/repositories';

import { ProjectPhaseMapper } from '@/infrastructure/mappers/ProjectPhaseMapper';

import type { Database } from '@/lib/database.types';

type DbProjectPhase = Database['public']['Tables']['project_phases']['Row'];

/**
 * Supabase-Implementierung des IProjectPhaseRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseProjectPhaseRepository implements IProjectPhaseRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<ProjectPhase | null> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    const tenantId = (data.projects as unknown as { tenant_id: string }).tenant_id;
    return ProjectPhaseMapper.toDomain(data as DbProjectPhase, tenantId);
  }

  async findByIds(ids: string[]): Promise<ProjectPhase[]> {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .in('id', ids);

    if (error || !data || data.length === 0) {
      return [];
    }

    const tenantId = (data[0].projects as unknown as { tenant_id: string }).tenant_id;
    return data.map((row) =>
      ProjectPhaseMapper.toDomain(row as DbProjectPhase, tenantId)
    );
  }

  async findByIdsWithProject(ids: string[]): Promise<
    Array<{
      id: string;
      name: string;
      bereich: string;
      project: { id: string; name: string; projectNumber?: string };
    }>
  > {
    if (ids.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('project_phases')
      .select(`
        id,
        name,
        bereich,
        projects!inner(
          id,
          name,
          project_number
        )
      `)
      .in('id', ids);

    if (error || !data) {
      return [];
    }

    return data.map((row) => {
      const project = row.projects as unknown as {
        id: string;
        name: string;
        project_number: string | null;
      };
      return {
        id: row.id,
        name: row.name,
        bereich: row.bereich,
        project: {
          id: project.id,
          name: project.name,
          projectNumber: project.project_number ?? undefined,
        },
      };
    });
  }

  async findByAsanaGid(gid: string, projectId: string): Promise<ProjectPhase | null> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('asana_gid', gid)
      .eq('project_id', projectId)
      .single();

    if (error || !data) {
      return null;
    }

    const tenantId = (data.projects as unknown as { tenant_id: string }).tenant_id;
    return ProjectPhaseMapper.toDomain(data as DbProjectPhase, tenantId);
  }

  async findAllByProject(projectId: string): Promise<ProjectPhase[]> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('project_id', projectId)
      .order('sort_order');

    if (error || !data || data.length === 0) {
      return [];
    }

    const tenantId = (data[0].projects as unknown as { tenant_id: string }).tenant_id;
    return data.map((row) =>
      ProjectPhaseMapper.toDomain(row as DbProjectPhase, tenantId)
    );
  }

  async findActiveByProject(projectId: string): Promise<ProjectPhase[]> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('sort_order');

    if (error || !data || data.length === 0) {
      return [];
    }

    const tenantId = (data[0].projects as unknown as { tenant_id: string }).tenant_id;
    return data.map((row) =>
      ProjectPhaseMapper.toDomain(row as DbProjectPhase, tenantId)
    );
  }

  async findByBereich(projectId: string, bereich: PhaseBereich): Promise<ProjectPhase[]> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('project_id', projectId)
      .eq('bereich', bereich)
      .eq('status', 'active')
      .order('sort_order');

    if (error || !data || data.length === 0) {
      return [];
    }

    const tenantId = (data[0].projects as unknown as { tenant_id: string }).tenant_id;
    return data.map((row) =>
      ProjectPhaseMapper.toDomain(row as DbProjectPhase, tenantId)
    );
  }

  async findReadyForHardDelete(tenantId: string): Promise<ProjectPhase[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data, error } = await this.supabase
      .from('project_phases')
      .select('*, projects!inner(tenant_id)')
      .eq('projects.tenant_id', tenantId)
      .eq('status', 'deleted')
      .lt('deleted_at', ninetyDaysAgo.toISOString())
      .order('deleted_at');

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) =>
      ProjectPhaseMapper.toDomain(row as DbProjectPhase, tenantId)
    );
  }

  async save(phase: ProjectPhase): Promise<ProjectPhase> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .upsert(ProjectPhaseMapper.toPersistence(phase))
      .select('*, projects!inner(tenant_id)')
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Phase: ${error?.message}`);
    }

    const tenantId = (data.projects as unknown as { tenant_id: string }).tenant_id;
    return ProjectPhaseMapper.toDomain(data as DbProjectPhase, tenantId);
  }

  async update(phase: ProjectPhase): Promise<ProjectPhase> {
    const { data, error } = await this.supabase
      .from('project_phases')
      .update({
        name: phase.name,
        bereich: phase.bereich,
        start_date: phase.startDate?.toISOString().split('T')[0] ?? null,
        end_date: phase.endDate?.toISOString().split('T')[0] ?? null,
        sort_order: phase.sortOrder,
        budget_hours: phase.budgetHours ?? null,
        status: phase.status,
        deleted_at: phase.deletedAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', phase.id)
      .select('*, projects!inner(tenant_id)')
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren der Phase: ${error?.message}`);
    }

    const tenantId = (data.projects as unknown as { tenant_id: string }).tenant_id;
    return ProjectPhaseMapper.toDomain(data as DbProjectPhase, tenantId);
  }

  async updateStatus(id: string, status: PhaseStatus): Promise<void> {
    const { error } = await this.supabase
      .from('project_phases')
      .update({
        status,
        deleted_at: status === 'deleted' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Aktualisieren des Status: ${error.message}`);
    }
  }

  async updateDates(
    id: string,
    dates: { startDate?: Date; endDate?: Date }
  ): Promise<void> {
    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (dates.startDate) {
      updateData.start_date = dates.startDate.toISOString().split('T')[0];
    }
    if (dates.endDate) {
      updateData.end_date = dates.endDate.toISOString().split('T')[0];
    }

    const { error } = await this.supabase
      .from('project_phases')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Aktualisieren der Datumsfelder: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('project_phases').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen der Phase: ${error.message}`);
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await this.supabase
      .from('project_phases')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Fehler beim Löschen der Phasen: ${error.message}`);
    }
  }
}
