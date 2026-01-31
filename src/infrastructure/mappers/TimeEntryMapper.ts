import { TimeEntry, type CreateTimeEntryProps } from '@/domain/entities/TimeEntry';

import type { Database } from '@/lib/database.types';

type DbTimeEntry = Database['public']['Tables']['time_entries']['Row'];
type DbTimeEntryInsert = Database['public']['Tables']['time_entries']['Insert'];

/**
 * Mapper für TimeEntry-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class TimeEntryMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbTimeEntry): TimeEntry {
    // timetac_id könnte null sein in der DB, aber für TimeEntry ist es Pflicht
    if (!row.timetac_id) {
      throw new Error('TimeEntry ohne timetac_id ist ungültig');
    }

    const props: CreateTimeEntryProps = {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      projectPhaseId: row.project_phase_id ?? undefined,
      date: new Date(row.date),
      hours: row.hours,
      description: row.description ?? undefined,
      timetacId: row.timetac_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return TimeEntry.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(entry: TimeEntry): DbTimeEntryInsert {
    return {
      id: entry.id,
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      project_phase_id: entry.projectPhaseId ?? null,
      date: entry.dateString,
      hours: entry.hours,
      description: entry.description ?? null,
      timetac_id: entry.timetacId,
      created_at: entry.createdAt.toISOString(),
      updated_at: entry.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbTimeEntry[]): TimeEntry[] {
    return rows.map((row) => TimeEntryMapper.toDomain(row));
  }
}
