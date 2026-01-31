import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AbsenceConflictEntity,
  AbsenceConflictWithUser,
  CreateConflictInput,
  IAbsenceConflictRepository,
} from '@/application/ports/repositories/IAbsenceConflictRepository';

import type { ConflictResolution, Database } from '@/lib/database.types';

type AbsenceConflictRow = Database['public']['Tables']['absence_conflicts']['Row'];

/**
 * Mappt eine Datenbank-Row zu einer Domain-Entity.
 */
function mapRowToEntity(row: AbsenceConflictRow): AbsenceConflictEntity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    allocationId: row.allocation_id,
    absenceId: row.absence_id,
    userId: row.user_id,
    date: new Date(row.date),
    absenceType: row.absence_type,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    resolvedBy: row.resolved_by ?? undefined,
    resolution: row.resolution ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Supabase-Implementierung des IAbsenceConflictRepository.
 */
export class SupabaseAbsenceConflictRepository implements IAbsenceConflictRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<AbsenceConflictEntity | null> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return mapRowToEntity(data);
  }

  async findByAllocationAndAbsence(
    allocationId: string,
    absenceId: string
  ): Promise<AbsenceConflictEntity | null> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .select('*')
      .eq('allocation_id', allocationId)
      .eq('absence_id', absenceId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapRowToEntity(data);
  }

  async findUnresolvedByTenant(tenantId: string): Promise<AbsenceConflictWithUser[]> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .select(
        `
        *,
        users!absence_conflicts_user_id_fkey (
          full_name
        )
      `
      )
      .eq('tenant_id', tenantId)
      .is('resolved_at', null)
      .order('date', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      ...mapRowToEntity(row),
      userName: (row.users as { full_name: string })?.full_name ?? 'Unbekannt',
    }));
  }

  async findByAbsenceId(absenceId: string): Promise<AbsenceConflictEntity[]> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .select('*')
      .eq('absence_id', absenceId)
      .order('date');

    if (error || !data) {
      return [];
    }

    return data.map(mapRowToEntity);
  }

  async findByAllocationId(allocationId: string): Promise<AbsenceConflictEntity[]> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .select('*')
      .eq('allocation_id', allocationId)
      .order('date');

    if (error || !data) {
      return [];
    }

    return data.map(mapRowToEntity);
  }

  async countUnresolvedByTenant(tenantId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('absence_conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('resolved_at', null);

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  async save(conflict: CreateConflictInput): Promise<AbsenceConflictEntity> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .insert({
        tenant_id: conflict.tenantId,
        allocation_id: conflict.allocationId,
        absence_id: conflict.absenceId,
        user_id: conflict.userId,
        date: conflict.date.toISOString().split('T')[0],
        absence_type: conflict.absenceType,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern des Konflikts: ${error?.message}`);
    }

    return mapRowToEntity(data);
  }

  async saveMany(conflicts: CreateConflictInput[]): Promise<AbsenceConflictEntity[]> {
    if (conflicts.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .insert(
        conflicts.map((c) => ({
          tenant_id: c.tenantId,
          allocation_id: c.allocationId,
          absence_id: c.absenceId,
          user_id: c.userId,
          date: c.date.toISOString().split('T')[0],
          absence_type: c.absenceType,
        }))
      )
      .select();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Konflikte: ${error?.message}`);
    }

    return data.map(mapRowToEntity);
  }

  async resolve(
    id: string,
    resolution: ConflictResolution,
    resolvedBy: string
  ): Promise<AbsenceConflictEntity> {
    const { data, error } = await this.supabase
      .from('absence_conflicts')
      .update({
        resolution,
        resolved_by: resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Lösen des Konflikts: ${error?.message}`);
    }

    return mapRowToEntity(data);
  }

  async deleteByAbsenceId(absenceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('absence_conflicts')
      .delete()
      .eq('absence_id', absenceId);

    if (error) {
      throw new Error(`Fehler beim Löschen der Konflikte: ${error.message}`);
    }
  }

  async deleteByAllocationId(allocationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('absence_conflicts')
      .delete()
      .eq('allocation_id', allocationId);

    if (error) {
      throw new Error(`Fehler beim Löschen der Konflikte: ${error.message}`);
    }
  }
}
