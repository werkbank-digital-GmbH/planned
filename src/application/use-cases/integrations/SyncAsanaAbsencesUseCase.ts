import { Absence, type AbsenceType } from '@/domain/entities/Absence';

import type { IAbsenceRepository } from '@/application/ports/repositories/IAbsenceRepository';
import type { IIntegrationCredentialsRepository } from '@/application/ports/repositories/IIntegrationCredentialsRepository';
import type { IIntegrationMappingRepository } from '@/application/ports/repositories/IIntegrationMappingRepository';
import type { IAsanaService } from '@/application/ports/services/IAsanaService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncAsanaAbsencesInput {
  tenantId: string;
  accessToken: string;
}

export interface AbsenceSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Synchronisiert Abwesenheiten aus einem Asana-Projekt.
 *
 * Jeder Task im konfigurierten Abwesenheiten-Projekt wird als Absence importiert:
 * - Task Assignee → User (via User-Mapping)
 * - Task Start/Due Date → Absence Zeitraum
 * - Task Name → Abwesenheitstyp (wenn erkannt) oder 'other'
 */
export class SyncAsanaAbsencesUseCase {
  constructor(
    private readonly asanaService: IAsanaService,
    private readonly credentialsRepo: IIntegrationCredentialsRepository,
    private readonly mappingRepo: IIntegrationMappingRepository,
    private readonly absenceRepo: IAbsenceRepository
  ) {}

  async execute(input: SyncAsanaAbsencesInput): Promise<AbsenceSyncResult> {
    const { tenantId, accessToken } = input;

    const result: AbsenceSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // 1. Credentials laden für Absence-Projekt-ID
    const credentials = await this.credentialsRepo.findByTenantId(tenantId);

    if (!credentials?.asanaAbsenceProjectId) {
      throw new Error('Kein Abwesenheiten-Projekt konfiguriert');
    }

    // 2. User-Mappings laden (Asana GID → Planned User ID)
    const userMappings = await this.mappingRepo.getAsMap(tenantId, 'asana', 'user');

    if (userMappings.size === 0) {
      throw new Error('Keine User-Mappings vorhanden. Bitte zuerst User synchronisieren.');
    }

    // 3. Absence Tasks aus Asana laden
    const tasks = await this.asanaService.getAbsenceTasks(
      credentials.asanaAbsenceProjectId,
      accessToken
    );

    // 4. Tasks verarbeiten
    for (const task of tasks) {
      try {
        // Überspringe abgeschlossene Tasks
        if (task.completed) {
          result.skipped++;
          continue;
        }

        // Assignee prüfen
        if (!task.assignee?.gid) {
          result.skipped++;
          result.errors.push(`Task "${task.name}": Kein Assignee`);
          continue;
        }

        // User-Mapping finden
        const plannedUserId = userMappings.get(task.assignee.gid);
        if (!plannedUserId) {
          result.skipped++;
          result.errors.push(`Task "${task.name}": User nicht gemappt (Asana GID: ${task.assignee.gid})`);
          continue;
        }

        // Start/End Date prüfen
        if (!task.start_on && !task.due_on) {
          result.skipped++;
          result.errors.push(`Task "${task.name}": Kein Datum`);
          continue;
        }

        // Daten vorbereiten
        const startDate = task.start_on
          ? new Date(task.start_on)
          : new Date(task.due_on!);
        const endDate = task.due_on
          ? new Date(task.due_on)
          : new Date(task.start_on!);

        // Abwesenheitstyp aus Task-Name ableiten
        const absenceType = this.parseAbsenceType(task.name);

        // Bestehende Absence suchen (per Asana GID)
        const existingAbsence = await this.absenceRepo.findByAsanaGid(task.gid);

        if (existingAbsence) {
          // Update
          const updated = Absence.create({
            id: existingAbsence.id,
            tenantId,
            userId: plannedUserId,
            type: absenceType,
            startDate,
            endDate,
            notes: task.name,
            asanaGid: task.gid,
            createdAt: existingAbsence.createdAt,
            updatedAt: new Date(),
          });
          await this.absenceRepo.update(updated);
          result.updated++;
        } else {
          // Create
          const absence = Absence.create({
            tenantId,
            userId: plannedUserId,
            type: absenceType,
            startDate,
            endDate,
            notes: task.name,
            asanaGid: task.gid,
          });
          await this.absenceRepo.save(absence);
          result.created++;
        }
      } catch (error) {
        result.errors.push(
          `Task "${task.name}": ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
        );
      }
    }

    return result;
  }

  /**
   * Versucht den Abwesenheitstyp aus dem Task-Namen zu erkennen.
   */
  private parseAbsenceType(taskName: string): AbsenceType {
    const name = taskName.toLowerCase();

    if (name.includes('urlaub') || name.includes('vacation')) {
      return 'vacation';
    }
    if (name.includes('krank') || name.includes('sick')) {
      return 'sick';
    }
    if (name.includes('feiertag') || name.includes('holiday')) {
      return 'holiday';
    }
    if (name.includes('fortbildung') || name.includes('training') || name.includes('schulung')) {
      return 'training';
    }

    return 'other';
  }
}
