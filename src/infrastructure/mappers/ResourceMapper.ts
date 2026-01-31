import { Resource, type CreateResourceProps } from '@/domain/entities/Resource';

import type { Database } from '@/lib/database.types';

type DbResource = Database['public']['Tables']['resources']['Row'];
type DbResourceInsert = Database['public']['Tables']['resources']['Insert'];

/**
 * Mapper für Resource-Entitäten.
 *
 * Konvertiert zwischen Datenbank-Rows und Domain-Entities.
 */
export class ResourceMapper {
  /**
   * Konvertiert eine Datenbank-Row in eine Domain-Entity.
   */
  static toDomain(row: DbResource): Resource {
    const props: CreateResourceProps = {
      id: row.id,
      tenantId: row.tenant_id,
      resourceTypeId: row.resource_type_id,
      name: row.name,
      licensePlate: row.license_plate ?? undefined,
      isActive: row.is_active ?? true,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };

    return Resource.create(props);
  }

  /**
   * Konvertiert eine Domain-Entity in eine Datenbank-Insert-Row.
   */
  static toPersistence(resource: Resource): DbResourceInsert {
    return {
      id: resource.id,
      tenant_id: resource.tenantId,
      resource_type_id: resource.resourceTypeId,
      name: resource.name,
      license_plate: resource.licensePlate ?? null,
      is_active: resource.isActive,
      created_at: resource.createdAt.toISOString(),
      updated_at: resource.updatedAt.toISOString(),
    };
  }

  /**
   * Konvertiert mehrere Datenbank-Rows in Domain-Entities.
   */
  static toDomainList(rows: DbResource[]): Resource[] {
    return rows.map((row) => ResourceMapper.toDomain(row));
  }
}
