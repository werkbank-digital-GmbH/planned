import type { SupabaseClient } from '@supabase/supabase-js';

import type { TimeEntry } from '@/domain/entities/TimeEntry';

import type { ITimeEntryRepository } from '@/application/ports/repositories';

import { TimeEntryMapper } from '@/infrastructure/mappers/TimeEntryMapper';

import type { Database } from '@/lib/database.types';

/**
 * Supabase-Implementierung des ITimeEntryRepository.
 *
 * TimeEntries kommen NUR aus TimeTac - es gibt KEIN manuelles CRUD!
 */
export class SupabaseTimeEntryRepository implements ITimeEntryRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<TimeEntry | null> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return TimeEntryMapper.toDomain(data);
  }

  async findByTimeTacId(timetacId: string, tenantId: string): Promise<TimeEntry | null> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .select('*')
      .eq('timetac_id', timetacId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return TimeEntryMapper.toDomain(data);
  }

  async findByUserAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date');

    if (error || !data) {
      return [];
    }

    return TimeEntryMapper.toDomainList(data);
  }

  async findByUserIdsAndDateRange(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; date: Date; hours: number }>> {
    if (userIds.length === 0) {
      return [];
    }

    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('time_entries')
      .select('user_id, date, hours')
      .in('user_id', userIds)
      .gte('date', startDateString)
      .lte('date', endDateString);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      userId: row.user_id,
      date: new Date(row.date),
      hours: row.hours,
    }));
  }

  async findByPhase(phaseId: string): Promise<TimeEntry[]> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .select('*')
      .eq('project_phase_id', phaseId)
      .order('date');

    if (error || !data) {
      return [];
    }

    return TimeEntryMapper.toDomainList(data);
  }

  async findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]> {
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('time_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date');

    if (error || !data) {
      return [];
    }

    return TimeEntryMapper.toDomainList(data);
  }

  async sumHoursByPhase(phaseId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .select('hours')
      .eq('project_phase_id', phaseId);

    if (error || !data) {
      return 0;
    }

    return data.reduce((sum, entry) => sum + entry.hours, 0);
  }

  async save(entry: TimeEntry): Promise<TimeEntry> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .insert(TimeEntryMapper.toPersistence(entry))
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern des TimeEntry: ${error?.message}`);
    }

    return TimeEntryMapper.toDomain(data);
  }

  async saveMany(entries: TimeEntry[]): Promise<TimeEntry[]> {
    if (entries.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('time_entries')
      .upsert(entries.map(TimeEntryMapper.toPersistence), {
        onConflict: 'timetac_id,tenant_id',
      })
      .select();

    if (error || !data) {
      throw new Error(`Fehler beim Speichern der TimeEntries: ${error?.message}`);
    }

    return TimeEntryMapper.toDomainList(data);
  }

  async upsertByTimeTacId(entry: TimeEntry): Promise<TimeEntry> {
    const { data, error } = await this.supabase
      .from('time_entries')
      .upsert(TimeEntryMapper.toPersistence(entry), {
        onConflict: 'timetac_id,tenant_id',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Fehler beim Upsert des TimeEntry: ${error?.message}`);
    }

    return TimeEntryMapper.toDomain(data);
  }
}
