import type { SyncService, SyncStatus } from '@/lib/database.types';

/**
 * Sync-Log Eintrag
 */
export interface SyncLogEntry {
  id: string;
  tenantId: string;
  service: SyncService;
  operation: string;
  status: SyncStatus;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

/**
 * Daten zum Erstellen eines Sync-Logs
 */
export interface CreateSyncLogData {
  tenantId: string;
  service: SyncService;
  operation: string;
  status?: SyncStatus;
}

/**
 * Daten zum Aktualisieren eines Sync-Logs
 */
export interface UpdateSyncLogData {
  status: SyncStatus;
  result?: Record<string, unknown>;
  errorMessage?: string;
  completedAt?: Date;
}

/**
 * Repository Interface für Sync-Logs.
 *
 * Protokolliert alle Synchronisations-Vorgänge für Debugging und Audit.
 */
export interface ISyncLogRepository {
  /**
   * Erstellt einen neuen Sync-Log Eintrag.
   */
  create(data: CreateSyncLogData): Promise<SyncLogEntry>;

  /**
   * Aktualisiert einen Sync-Log Eintrag.
   */
  update(id: string, data: UpdateSyncLogData): Promise<void>;

  /**
   * Findet einen Sync-Log anhand seiner ID.
   */
  findById(id: string): Promise<SyncLogEntry | null>;

  /**
   * Findet alle Sync-Logs eines Tenants.
   */
  findByTenantId(
    tenantId: string,
    options?: {
      limit?: number;
      service?: SyncService;
    }
  ): Promise<SyncLogEntry[]>;

  /**
   * Findet den letzten erfolgreichen Sync für einen Service.
   */
  findLastSuccessful(tenantId: string, service: SyncService): Promise<SyncLogEntry | null>;

  /**
   * Löscht alte Sync-Logs (älter als angegebene Tage).
   */
  deleteOlderThan(tenantId: string, days: number): Promise<number>;
}
