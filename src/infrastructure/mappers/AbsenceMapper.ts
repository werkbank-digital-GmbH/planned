import { Absence, type CreateAbsenceProps, type AbsenceType } from '@/domain/entities/Absence';

import type { Database } from '@/lib/database.types';

type DbAbsence = Database['public']['Tables']['absences']['Row'];
type DbAbsenceInsert = Database['public']['Tables']['absences']['Insert'];

/**
 * Mapper für Absence-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class AbsenceMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbAbsence): Absence {
    const props: CreateAbsenceProps = {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      type: row.type as AbsenceType,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      notes: row.notes ?? undefined,
      asanaGid: row.asana_gid ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return Absence.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(absence: Absence): DbAbsenceInsert {
    return {
      id: absence.id,
      tenant_id: absence.tenantId,
      user_id: absence.userId,
      type: absence.type,
      start_date: absence.startDate.toISOString().split('T')[0],
      end_date: absence.endDate.toISOString().split('T')[0],
      notes: absence.notes ?? null,
      asana_gid: absence.asanaGid ?? null,
      created_at: absence.createdAt.toISOString(),
      updated_at: absence.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbAbsence[]): Absence[] {
    return rows.map((row) => AbsenceMapper.toDomain(row));
  }
}
