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
    // Extended row type for fields not yet in generated types
    const extendedRow = row as DbProject & {
      address_conflict?: boolean;
      address_lat?: number | null;
      address_lng?: number | null;
      address_geocoded_at?: string | null;
    };

    const props: CreateProjectProps = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      clientName: row.client_name ?? undefined,
      address: row.address ?? undefined,
      addressConflict: extendedRow.address_conflict ?? false,
      addressLat: extendedRow.address_lat != null ? Number(extendedRow.address_lat) : undefined,
      addressLng: extendedRow.address_lng != null ? Number(extendedRow.address_lng) : undefined,
      addressGeocodedAt: extendedRow.address_geocoded_at
        ? new Date(extendedRow.address_geocoded_at)
        : undefined,
      status: row.status as ProjectStatus,
      asanaGid: row.asana_gid ?? undefined,
      driveFolderUrl: row.drive_folder_url ?? undefined,
      syncedAt: row.synced_at ? new Date(row.synced_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return Project.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(project: Project): DbProjectInsert & {
    address_conflict?: boolean;
    address_lat?: number | null;
    address_lng?: number | null;
    address_geocoded_at?: string | null;
  } {
    return {
      id: project.id,
      tenant_id: project.tenantId,
      name: project.name,
      client_name: project.clientName ?? null,
      address: project.address ?? null,
      address_conflict: project.addressConflict,
      address_lat: project.addressLat ?? null,
      address_lng: project.addressLng ?? null,
      address_geocoded_at: project.addressGeocodedAt?.toISOString() ?? null,
      status: project.status,
      asana_gid: project.asanaGid ?? null,
      drive_folder_url: project.driveFolderUrl ?? null,
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
