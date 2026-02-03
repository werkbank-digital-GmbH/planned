import { ProjectPhase, type CreateProjectPhaseProps } from '@/domain/entities/ProjectPhase';
import type { PhaseBereich, PhaseStatus } from '@/domain/types';

import type { Database } from '@/lib/database.types';

type DbProjectPhase = Database['public']['Tables']['project_phases']['Row'];
type DbProjectPhaseInsert = Database['public']['Tables']['project_phases']['Insert'];

/**
 * Mapper für ProjectPhase-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 *
 * Hinweis: tenantId muss extern übergeben werden, da es in der
 * project_phases Tabelle nicht direkt vorhanden ist (kommt via projects).
 */
export class ProjectPhaseMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   *
   * @param row Die Datenbank-Row
   * @param tenantId Die Tenant-ID (muss von außen übergeben werden)
   */
  static toDomain(row: DbProjectPhase, tenantId: string): ProjectPhase {
    const props: CreateProjectPhaseProps = {
      id: row.id,
      projectId: row.project_id,
      tenantId,
      name: row.name,
      bereich: row.bereich as PhaseBereich,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      sortOrder: row.sort_order ?? 0,
      budgetHours: row.budget_hours ?? undefined,
      plannedHours: row.planned_hours ?? 0,
      actualHours: row.actual_hours ?? 0,
      status: row.status as PhaseStatus,
      asanaGid: row.asana_gid ?? undefined,
      description: (row as DbProjectPhase & { description?: string }).description ?? undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return ProjectPhase.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(phase: ProjectPhase): DbProjectPhaseInsert & { description?: string | null } {
    return {
      id: phase.id,
      project_id: phase.projectId,
      name: phase.name,
      bereich: phase.bereich,
      start_date: phase.startDate?.toISOString().split('T')[0] ?? null,
      end_date: phase.endDate?.toISOString().split('T')[0] ?? null,
      sort_order: phase.sortOrder,
      budget_hours: phase.budgetHours ?? null,
      planned_hours: phase.plannedHours,
      actual_hours: phase.actualHours,
      status: phase.status,
      asana_gid: phase.asanaGid ?? null,
      description: phase.description ?? null,
      deleted_at: phase.deletedAt?.toISOString() ?? null,
      created_at: phase.createdAt.toISOString(),
      updated_at: phase.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbProjectPhase[], tenantId: string): ProjectPhase[] {
    return rows.map((row) => ProjectPhaseMapper.toDomain(row, tenantId));
  }
}
