import type { SupabaseClient } from '@supabase/supabase-js';

import type { Absence } from '@/domain/entities/Absence';

import type { IAbsenceRepository } from '@/application/ports/repositories';

import { AbsenceMapper } from '@/infrastructure/mappers/AbsenceMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des IAbsenceRepository.
 *
 * Mappt zwischen Domain-Entities und Datenbank-Rows.
 */
export class SupabaseAbsenceRepository implements IAbsenceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<Absence | null> {
    const { data, error } = await this.supabase
      .from('absences')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return AbsenceMapper.toDomain(data);
  }

  async findByUser(userId: string): Promise<Absence[]> {
    const { data, error } = await this.supabase
      .from('absences')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error || !data) {
      return [];
    }

    return AbsenceMapper.toDomainList(data);
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Absence[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    // Finde Abwesenheiten die sich mit dem Zeitraum überschneiden:
    // Eine Abwesenheit überlappt, wenn:
    // - absence.start_date <= endDate UND
    // - absence.end_date >= startDate
    const { data, error } = await this.supabase
      .from('absences')
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', endDateString)
      .gte('end_date', startDateString)
      .order('start_date');

    if (error || !data) {
      return [];
    }

    return AbsenceMapper.toDomainList(data);
  }

  async findByUsersAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; type: string; startDate: Date; endDate: Date }>> {
    if (userIds.length === 0) {
      return [];
    }

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('absences')
      .select('user_id, type, start_date, end_date')
      .in('user_id', userIds)
      .lte('start_date', endDateString)
      .gte('end_date', startDateString);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      userId: row.user_id,
      type: row.type,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
    }));
  }

  async findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Absence[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('absences')
      .select('*')
      .eq('tenant_id', tenantId)
      .lte('start_date', endDateString)
      .gte('end_date', startDateString)
      .order('start_date');

    if (error || !data) {
      return [];
    }

    return AbsenceMapper.toDomainList(data);
  }

  async findByTimetacId(timetacId: string): Promise<Absence | null> {
    const { data, error } = await this.supabase
      .from('absences')
      .select('*')
      .eq('timetac_id', timetacId)
      .single();

    if (error || !data) {
      return null;
    }

    return AbsenceMapper.toDomain(data);
  }

  async save(absence: Absence): Promise<Absence> {
    const { data, error } = await this.supabase
      .from('absences')
      .insert(AbsenceMapper.toPersistence(absence))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der Absence: ${error?.message}`);
    }

    return AbsenceMapper.toDomain(data);
  }

  async update(absence: Absence): Promise<Absence> {
    const { data, error } = await this.supabase
      .from('absences')
      .update({
        type: absence.type,
        start_date: absence.startDate.toISOString().split('T')[0],
        end_date: absence.endDate.toISOString().split('T')[0],
        notes: absence.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', absence.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Aktualisieren der Absence: ${error?.message}`);
    }

    return AbsenceMapper.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('absences').delete().eq('id', id);

    if (error) {
      throw new Error(`Fehler beim Löschen der Absence: ${error.message}`);
    }
  }

  async upsertByTimetacId(absence: Absence): Promise<Absence> {
    if (!absence.timetacId) {
      throw new Error('TimeTac-ID ist erforderlich für upsert');
    }

    const existing = await this.findByTimetacId(absence.timetacId);

    if (existing) {
      // Update existing
      const { data, error } = await this.supabase
        .from('absences')
        .update({
          type: absence.type,
          start_date: absence.startDate.toISOString().split('T')[0],
          end_date: absence.endDate.toISOString().split('T')[0],
          notes: absence.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('timetac_id', absence.timetacId)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Fehler beim Aktualisieren der Absence: ${error?.message}`);
      }

      return AbsenceMapper.toDomain(data);
    } else {
      // Insert new
      return this.save(absence);
    }
  }
}
