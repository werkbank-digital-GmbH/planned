import type { SupabaseClient } from '@supabase/supabase-js';

import type { Allocation } from '@/domain/entities/Allocation';

import type { IAllocationRepository } from '@/application/ports/repositories';

import { AllocationMapper } from '@/infrastructure/mappers/AllocationMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des IAllocationRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseAllocationRepository implements IAllocationRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Allocation | null> {
    const { data, error } = await this.supabase
      .from('allocations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return AllocationMapper.toDomain(data);
  }

  async findByUserAndDate(userId: string, date: Date): Promise<Allocation[]> {
    const dateString = date.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('allocations')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateString)
      .order('created_at');

    if (error || !data) {
      return [];
    }

    return AllocationMapper.toDomainList(data);
  }

  async findByResourceAndDate(resourceId: string, date: Date): Promise<Allocation[]> {
    const dateString = date.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('allocations')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('date', dateString)
      .order('created_at');

    if (error || !data) {
      return [];
    }

    return AllocationMapper.toDomainList(data);
  }

  async findByPhaseAndDateRange(
    phaseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('allocations')
      .select('*')
      .eq('project_phase_id', phaseId)
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date');

    if (error || !data) {
      return [];
    }

    return AllocationMapper.toDomainList(data);
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Allocation[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('allocations')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date');

    if (error || !data) {
      return [];
    }

    return AllocationMapper.toDomainList(data);
  }

  async findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: { projectId?: string; userId?: string }
  ): Promise<Allocation[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Für Projekt-Filter brauchen wir einen Join
    if (filters?.projectId) {
      const query = this.supabase
        .from('allocations')
        .select('*, project_phases!inner(project_id)')
        .eq('tenant_id', tenantId)
        .gte('date', startDateString)
        .lte('date', endDateString)
        .eq('project_phases.project_id', filters.projectId);

      // User-Filter zusätzlich anwenden
      const finalQuery = filters.userId ? query.eq('user_id', filters.userId) : query;

      const { data, error } = await finalQuery.order('date');

      if (error || !data) {
        return [];
      }

      // Extrahiere nur die Allocation-Daten (ohne Join-Daten)
      return AllocationMapper.toDomainList(
        data.map((row) => ({
          id: row.id,
          tenant_id: row.tenant_id,
          user_id: row.user_id,
          resource_id: row.resource_id,
          project_phase_id: row.project_phase_id,
          date: row.date,
          planned_hours: row.planned_hours,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
      );
    }

    // Ohne Projekt-Filter: einfache Query
    let query = this.supabase
      .from('allocations')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDateString)
      .lte('date', endDateString);

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query.order('date');

    if (error || !data) {
      return [];
    }

    return AllocationMapper.toDomainList(data);
  }

  async countByUserAndDate(userId: string, date: Date): Promise<number> {
    const dateString = date.toISOString().split('T')[0];

    const { count, error } = await this.supabase
      .from('allocations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('date', dateString);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  async save(allocation: Allocation): Promise<Allocation> {
    const { data, error } = await this.supabase
      .from('allocations')
      .insert(AllocationMapper.toPersistence(allocation))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Allocation: ${error?.message}`);
    }

    return AllocationMapper.toDomain(data);
  }

  async saveMany(allocations: Allocation[]): Promise<Allocation[]> {
    if (allocations.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('allocations')
      .insert(allocations.map(AllocationMapper.toPersistence))
      .select();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Allocations: ${error?.message}`);
    }

    return AllocationMapper.toDomainList(data);
  }

  async update(allocation: Allocation): Promise<Allocation> {
    const { data, error } = await this.supabase
      .from('allocations')
      .update({
        project_phase_id: allocation.projectPhaseId,
        date: allocation.dateString,
        planned_hours: allocation.plannedHours ?? null,
        notes: allocation.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocation.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren der Allocation: ${error?.message}`);
    }

    return AllocationMapper.toDomain(data);
  }

  async updateManyPlannedHours(
    updates: { id: string; plannedHours: number }[]
  ): Promise<void> {
    // Supabase doesn't have bulk update, so we need to do individual updates
    // In production, this could be optimized with a stored procedure
    const promises = updates.map(({ id, plannedHours }) =>
      this.supabase
        .from('allocations')
        .update({
          planned_hours: plannedHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    );

    const results = await Promise.all(promises);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      throw new Error(
        `Fehler beim Aktualisieren der PlannedHours: ${errors[0].error?.message}`
      );
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('allocations').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen der Allocation: ${error.message}`);
    }
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await this.supabase.from('allocations').delete().in('id', ids);

    if (error) {
      throw new Error(`Fehler beim Löschen der Allocations: ${error.message}`);
    }
  }

  async moveToDate(id: string, newDate: Date): Promise<Allocation> {
    const dateString = newDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('allocations')
      .update({
        date: dateString,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Verschieben der Allocation: ${error?.message}`);
    }

    return AllocationMapper.toDomain(data);
  }

  async moveToPhase(id: string, newPhaseId: string): Promise<Allocation> {
    const { data, error } = await this.supabase
      .from('allocations')
      .update({
        project_phase_id: newPhaseId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Verschieben der Allocation: ${error?.message}`);
    }

    return AllocationMapper.toDomain(data);
  }
}
