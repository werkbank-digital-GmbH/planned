import { Allocation, type CreateAllocationProps } from '@/domain/entities/Allocation';

import type { Database } from '@/lib/database.types';

type DbAllocation = Database['public']['Tables']['allocations']['Row'];
type DbAllocationInsert = Database['public']['Tables']['allocations']['Insert'];

/**
 * Mapper für Allocation-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class AllocationMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbAllocation): Allocation {
    const props: CreateAllocationProps = {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id ?? undefined,
      resourceId: row.resource_id ?? undefined,
      projectPhaseId: row.project_phase_id,
      date: new Date(row.date),
      plannedHours: row.planned_hours ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Allocation.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(allocation: Allocation): DbAllocationInsert {
    return {
      id: allocation.id,
      tenant_id: allocation.tenantId,
      user_id: allocation.userId ?? null,
      resource_id: allocation.resourceId ?? null,
      project_phase_id: allocation.projectPhaseId,
      date: allocation.dateString,
      planned_hours: allocation.plannedHours ?? null,
      notes: allocation.notes ?? null,
      created_at: allocation.createdAt.toISOString(),
      updated_at: allocation.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbAllocation[]): Allocation[] {
    return rows.map((row) => AllocationMapper.toDomain(row));
  }
}
