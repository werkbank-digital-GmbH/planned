import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CreateSyncLogData,
  ISyncLogRepository,
  SyncLogEntry,
  UpdateSyncLogData,
} from '@/application/ports/repositories';

import type { Database, SyncService } from '@/lib/database.types';

type SyncLogRow = Database['public']['Tables']['sync_logs']['Row'];

// ═══════════════════════════════════════════════════════════════════════════
// MAPPER
// ═══════════════════════════════════════════════════════════════════════════

function mapToDomain(row: SyncLogRow): SyncLogEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    service: row.service,
    operation: row.operation,
    status: row.status,
    result: row.result as Record<string, unknown> | null,
    errorMessage: row.error_message,
    startedAt: row.started_at ? new Date(row.started_at) : new Date(),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Supabase-Implementierung des ISyncLogRepository.
 *
 * Protokolliert alle Synchronisations-Vorgänge für Debugging und Audit.
 */
export class SupabaseSyncLogRepository implements ISyncLogRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async create(data: CreateSyncLogData): Promise<SyncLogEntry> {
    const { data: result, error } = await this.supabase
      .from('sync_logs')
      .insert({
        tenant_id: data.tenantId,
        service: data.service,
        operation: data.operation,
        status: data.status ?? 'running',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Sync-Log erstellen fehlgeschlagen: ${error.message}`);
    }

    return mapToDomain(result);
  }

  async update(id: string, data: UpdateSyncLogData): Promise<void> {
    const updateData: Database['public']['Tables']['sync_logs']['Update'] = {
      status: data.status,
    };

    if (data.result !== undefined) {
      updateData.result = data.result as Database['public']['Tables']['sync_logs']['Update']['result'];
    }
    if (data.errorMessage !== undefined) {
      updateData.error_message = data.errorMessage;
    }
    if (data.completedAt !== undefined) {
      updateData.completed_at = data.completedAt.toISOString();
    }

    const { error } = await this.supabase
      .from('sync_logs')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Sync-Log aktualisieren fehlgeschlagen: ${error.message}`);
    }
  }

  async findById(id: string): Promise<SyncLogEntry | null> {
    const { data, error } = await this.supabase
      .from('sync_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return mapToDomain(data);
  }

  async findByTenantId(
    tenantId: string,
    options?: {
      limit?: number;
      service?: SyncService;
    }
  ): Promise<SyncLogEntry[]> {
    let query = this.supabase
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false });

    if (options?.service) {
      query = query.eq('service', options.service);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map(mapToDomain);
  }

  async findLastSuccessful(
    tenantId: string,
    service: SyncService
  ): Promise<SyncLogEntry | null> {
    const { data, error } = await this.supabase
      .from('sync_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('service', service)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return mapToDomain(data);
  }

  async deleteOlderThan(tenantId: string, days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('sync_logs')
      .delete()
      .eq('tenant_id', tenantId)
      .lt('started_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Alte Sync-Logs löschen fehlgeschlagen: ${error.message}`);
    }

    return data?.length ?? 0;
  }
}
