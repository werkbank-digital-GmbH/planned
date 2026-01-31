import { Absence } from '@/domain/entities/Absence';

import type {
  IAbsenceConflictRepository,
  IAbsenceRepository,
  IAllocationRepository,
  IIntegrationCredentialsRepository,
  ISyncLogRepository,
  IUserRepository,
} from '@/application/ports/repositories';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';
import type { ITimeTacService, TimeTacSyncConfig } from '@/application/ports/services/ITimeTacService';
import { AbsenceConflictService } from '@/application/services/AbsenceConflictService';

import type { AbsenceType } from '@/lib/database.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncAbsencesResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  conflictsDetected: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard-Mapping für Abwesenheitstypen.
 * Kann pro Tenant angepasst werden.
 */
const DEFAULT_ABSENCE_TYPE_MAPPING: Record<number, AbsenceType> = {
  1: 'vacation', // Urlaub
  2: 'sick', // Krank
  3: 'holiday', // Feiertag
  4: 'training', // Fortbildung
};

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Synchronisiert Abwesenheiten aus TimeTac.
 *
 * Prozess:
 * 1. Credentials laden und entschlüsseln
 * 2. User-Mapping laden (lokale User mit TimeTac-IDs)
 * 3. Abwesenheiten von TimeTac laden
 * 4. Für jede Abwesenheit: Create oder Update
 * 5. Sync-Log erstellen
 */
export class SyncTimeTacAbsencesUseCase {
  private readonly conflictService: AbsenceConflictService;

  constructor(
    private readonly timetacService: ITimeTacService,
    private readonly absenceRepository: IAbsenceRepository,
    private readonly userRepository: IUserRepository,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly syncLogRepository: ISyncLogRepository,
    private readonly encryptionService: IEncryptionService,
    private readonly allocationRepository: IAllocationRepository,
    private readonly conflictRepository: IAbsenceConflictRepository
  ) {
    this.conflictService = new AbsenceConflictService(
      this.allocationRepository,
      this.conflictRepository
    );
  }

  async execute(
    tenantId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<SyncAbsencesResult> {
    const result: SyncAbsencesResult = {
      success: false,
      created: 0,
      updated: 0,
      skipped: 0,
      conflictsDetected: 0,
      errors: [],
    };

    // Liste der sync'd Absences für Konflikt-Prüfung
    const syncedAbsences: Absence[] = [];

    // Sync-Log starten
    const syncLog = await this.syncLogRepository.create({
      tenantId,
      service: 'timetac',
      operation: 'sync_absences',
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

      // 3. Date Range (Default: nächste 3 Monate)
      const startDate = dateRange?.start ?? new Date();
      const endDate =
        dateRange?.end ??
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      // 4. Abwesenheiten von TimeTac laden
      const timetacAbsences = await this.timetacService.getAbsences(
        apiKey,
        startDate,
        endDate
      );

      // 5. Sync Config (kann später pro Tenant konfigurierbar sein)
      const config: TimeTacSyncConfig = {
        absenceTypeMapping: DEFAULT_ABSENCE_TYPE_MAPPING,
      };

      // 6. Sync durchführen
      for (const ttAbsence of timetacAbsences) {
        const userId = userMap.get(String(ttAbsence.user_id));
        if (!userId) {
          result.skipped++;
          continue;
        }

        try {
          const absenceType = this.timetacService.mapAbsenceType(
            ttAbsence.absence_type_id,
            config
          );

          // Existierende Absence suchen
          const existing = await this.absenceRepository.findByTimetacId(
            String(ttAbsence.id)
          );

          const now = new Date();

          if (existing) {
            // Update
            const updated = Absence.create({
              id: existing.id,
              tenantId,
              userId,
              type: absenceType,
              startDate: new Date(ttAbsence.date_from),
              endDate: new Date(ttAbsence.date_to),
              timetacId: String(ttAbsence.id),
              createdAt: existing.createdAt,
              updatedAt: now,
            });
            await this.absenceRepository.update(updated);
            syncedAbsences.push(updated);
            result.updated++;
          } else {
            // Create
            const absence = Absence.create({
              tenantId,
              userId,
              type: absenceType,
              startDate: new Date(ttAbsence.date_from),
              endDate: new Date(ttAbsence.date_to),
              timetacId: String(ttAbsence.id),
              createdAt: now,
              updatedAt: now,
            });
            const savedAbsence = await this.absenceRepository.save(absence);
            syncedAbsences.push(savedAbsence);
            result.created++;
          }
        } catch (error) {
          result.errors.push(
            `Abwesenheit ${ttAbsence.id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }

      // 7. Konflikte erkennen für alle synced Absences
      for (const absence of syncedAbsences) {
        try {
          const conflicts = await this.conflictService.detectAndRecordConflicts(absence);
          result.conflictsDetected += conflicts.length;
        } catch (error) {
          // Konflikt-Erkennung sollte nicht den ganzen Sync abbrechen
          result.errors.push(
            `Konflikt-Erkennung für ${absence.id}: ${error instanceof Error ? error.message : 'Fehler'}`
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
          conflictsDetected: result.conflictsDetected,
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
}
