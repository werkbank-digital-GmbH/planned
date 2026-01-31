import { TimeEntry } from '@/domain/entities/TimeEntry';

import type {
  IIntegrationCredentialsRepository,
  IIntegrationMappingRepository,
  ISyncLogRepository,
  ITimeEntryRepository,
  IUserRepository,
} from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService } from '@/application/ports/services/ITimeTacService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncTimeEntriesResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Synchronisiert Zeiteinträge aus TimeTac.
 *
 * Prozess:
 * 1. Credentials laden und entschlüsseln
 * 2. User-Mapping laden (lokale User mit TimeTac-IDs)
 * 3. TimeEntries von TimeTac laden
 * 4. Für jeden Eintrag: Create oder Update
 * 5. Sync-Log erstellen
 */
export class SyncTimeTacTimeEntriesUseCase {
  constructor(
    private readonly timetacService: ITimeTacService,
    private readonly timeEntryRepository: ITimeEntryRepository,
    private readonly userRepository: IUserRepository,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly syncLogRepository: ISyncLogRepository,
    private readonly encryptionService: IEncryptionService,
    private readonly mappingRepository?: IIntegrationMappingRepository
  ) {}

  async execute(
    tenantId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<SyncTimeEntriesResult> {
    const result: SyncTimeEntriesResult = {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Sync-Log starten
    const syncLog = await this.syncLogRepository.create({
      tenantId,
      service: 'timetac',
      operation: 'sync_time_entries',
      status: 'running',
    });

    try {
      // 1. Credentials laden
      const credentials = await this.credentialsRepository.findByTenantId(tenantId);

      if (!credentials?.timetacApiToken) {
        throw new Error('TimeTac ist nicht verbunden');
      }

      const apiKey = this.encryptionService.decrypt(credentials.timetacApiToken);

      // 2. User-Mapping laden
      const users = await this.userRepository.findByTenantWithTimetacId(tenantId);
      const userMap = new Map(users.map((u) => [u.timetacId, u.id]));

      if (userMap.size === 0) {
        result.errors.push('Keine User mit TimeTac-Zuordnung gefunden');
        result.success = true;
        await this.syncLogRepository.update(syncLog.id, {
          status: 'success',
          result: { created: 0, updated: 0, skipped: 0, message: 'Keine User zugeordnet' },
          completedAt: new Date(),
        });
        return result;
      }

      // 3. Date Range (Default: letzte 7 Tage bis heute)
      const endDate = dateRange?.end ?? new Date();
      const startDate =
        dateRange?.start ??
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 4. TimeEntries von TimeTac laden
      const timetacEntries = await this.timetacService.getTimeEntries(
        apiKey,
        startDate,
        endDate
      );

      // 5. Projekt-Mapping laden
      const projectMapping = await this.getProjectMapping(tenantId);

      // 6. Sync durchführen
      for (const ttEntry of timetacEntries) {
        const userId = userMap.get(String(ttEntry.user_id));
        if (!userId) {
          result.skipped++;
          continue;
        }

        try {
          // Existierenden TimeEntry suchen
          const existing = await this.timeEntryRepository.findByTimeTacId(
            String(ttEntry.id),
            tenantId
          );

          // Projekt-Zuordnung ermitteln
          let projectPhaseId: string | undefined;
          if (ttEntry.project_id && projectMapping.has(ttEntry.project_id)) {
            projectPhaseId = projectMapping.get(ttEntry.project_id);
          }

          const now = new Date();

          if (existing) {
            // Update
            const updated = TimeEntry.create({
              id: existing.id,
              tenantId,
              userId,
              projectPhaseId,
              date: new Date(ttEntry.date),
              hours: ttEntry.duration_hours,
              description: ttEntry.note,
              timetacId: String(ttEntry.id),
              createdAt: existing.createdAt,
              updatedAt: now,
            });
            await this.timeEntryRepository.upsertByTimeTacId(updated);
            result.updated++;
          } else {
            // Create
            const entry = TimeEntry.create({
              tenantId,
              userId,
              projectPhaseId,
              date: new Date(ttEntry.date),
              hours: ttEntry.duration_hours,
              description: ttEntry.note,
              timetacId: String(ttEntry.id),
              createdAt: now,
              updatedAt: now,
            });
            await this.timeEntryRepository.save(entry);
            result.created++;
          }
        } catch (error) {
          result.errors.push(
            `TimeEntry ${ttEntry.id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }

      // Erfolg
      result.success = true;

      // Sync-Log abschließen
      await this.syncLogRepository.update(syncLog.id, {
        status: 'success',
        result: {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
        },
        completedAt: new Date(),
      });

      return result;
    } catch (error) {
      // Fehler im Sync-Log speichern
      await this.syncLogRepository.update(syncLog.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler',
        completedAt: new Date(),
      });

      result.errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
      return result;
    }
  }

  /**
   * Lädt das Projekt-Mapping: TimeTac Project ID → Planned Phase ID
   */
  private async getProjectMapping(tenantId: string): Promise<Map<number, string>> {
    if (!this.mappingRepository) {
      return new Map();
    }

    const mappings = await this.mappingRepository.findByTenantAndType(
      tenantId,
      'timetac',
      'project'
    );

    return new Map(
      mappings.map((m) => [parseInt(m.externalId, 10), m.internalId])
    );
  }
}
