import { Project, type CreateProjectProps } from '@/domain/entities/Project';
import type { ProjectStatus } from '@/domain/types';

import type { Database } from '@/lib/database.types';

type DbProject = Database['public']['Tables']['projects']['Row'];
type DbProjectInsert = Database['public']['Tables']['projects']['Insert'];

/**
 * Mapper für Projekt-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class ProjectMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbProject): Project {
    const props: CreateProjectProps = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      clientName: row.client_name ?? undefined,
      address: row.address ?? undefined,
      status: row.status as ProjectStatus,
      asanaGid: row.asana_gid ?? undefined,
      syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return Project.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(project: Project): DbProjectInsert {
    return {
      id: project.id,
      tenant_id: project.tenantId,
      name: project.name,
      client_name: project.clientName ?? null,
      address: project.address ?? null,
      status: project.status,
      asana_gid: project.asanaGid ?? null,
      synced_at: project.syncedAt?.toISOString() ?? null,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbProject[]): Project[] {
    return rows.map((row) => ProjectMapper.toDomain(row));
  }
}
