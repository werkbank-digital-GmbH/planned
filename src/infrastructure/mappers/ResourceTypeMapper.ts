import { ResourceType, type CreateResourceTypeProps } from '@/domain/entities/ResourceType';

import type { Database } from '@/lib/database.types';

type DbResourceType = Database['public']['Tables']['resource_types']['Row'];
type DbResourceTypeInsert = Database['public']['Tables']['resource_types']['Insert'];

/**
 * Mapper für ResourceType-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class ResourceTypeMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbResourceType): ResourceType {
    const props: CreateResourceTypeProps = {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      icon: row.icon ?? undefined,
      color: row.color ?? undefined,
      sortOrder: row.sort_order,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return ResourceType.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(resourceType: ResourceType): DbResourceTypeInsert {
    return {
      id: resourceType.id,
      tenant_id: resourceType.tenantId,
      name: resourceType.name,
      icon: resourceType.icon ?? null,
      color: resourceType.color ?? null,
      sort_order: resourceType.sortOrder,
      created_at: resourceType.createdAt.toISOString(),
      updated_at: resourceType.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbResourceType[]): ResourceType[] {
    return rows.map((row) => ResourceTypeMapper.toDomain(row));
  }
}
