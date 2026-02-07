import { Project } from '@/domain/entities/Project';
import { ProjectPhase } from '@/domain/entities/ProjectPhase';
import type { PhaseBereich } from '@/domain/types';

import type {
  IIntegrationCredentialsRepository,
  IProjectPhaseRepository,
  IProjectRepository,
  ISyncLogRepository,
} from '@/application/ports/repositories';
import type { AsanaTaskSyncConfig, IAsanaService, IGeocodingService } from '@/application/ports/services';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TaskSyncResult {
  success: boolean;
  projectsCreated: number;
  projectsUpdated: number;
  phasesCreated: number;
  phasesUpdated: number;
  tasksSkipped: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Synchronisiert Projekte und Phasen aus Asana (Task-basiert).
 *
 * NEUE Logik:
 * 1. Tasks aus dem Source-Projekt (z.B. "Jahresplanung") laden
 * 2. Für jeden Task: Finde das "andere" Projekt aus task.projects[]
 * 3. Wenn Projekt im konfigurierten Team → Projekt + Phase erstellen/updaten
 * 4. Phasen-Daten kommen aus Task Custom Fields (Projektphase, Zuordnung, Soll-Stunden)
 * 5. Start/End aus Task Due Date Range
 */
export class SyncAsanaTaskPhasesUseCase {
  constructor(
    private readonly asanaService: IAsanaService,
    private readonly projectRepository: IProjectRepository,
    private readonly projectPhaseRepository: IProjectPhaseRepository,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly syncLogRepository: ISyncLogRepository,
    private readonly encryptionService: IEncryptionService,
    private readonly geocodingService?: IGeocodingService
  ) {}

  async execute(tenantId: string): Promise<TaskSyncResult> {
    const result: TaskSyncResult = {
      success: false,
      projectsCreated: 0,
      projectsUpdated: 0,
      phasesCreated: 0,
      phasesUpdated: 0,
      tasksSkipped: 0,
      errors: [],
    };

    // Sync-Log starten
    const syncLog = await this.syncLogRepository.create({
      tenantId,
      service: 'asana',
      operation: 'sync_task_phases',
      status: 'running',
    });

    try {
      // 1. Credentials laden und Access Token holen
      const accessToken = await this.getAccessToken(tenantId);

      // 2. Sync-Config erstellen
      const config = await this.getSyncConfig(tenantId);

      // 3. Team-Projekte laden (für Validierung)
      const teamProjects = await this.asanaService.getTeamProjects(
        config.teamId,
        accessToken,
        { archived: false }
      );
      const teamProjectGids = new Set(teamProjects.map((p) => p.gid));

      // 4. Tasks aus Source-Projekt laden
      const tasks = await this.asanaService.getTasksFromProject(
        config.sourceProjectId,
        accessToken
      );

      // 5. Tasks verarbeiten und Projekte/Phasen synchronisieren
      // Gruppiere Tasks nach Projekt
      const projectPhaseMap = new Map<string, {
        projectName: string;
        phases: Array<{
          asanaGid: string;
          name: string;
          bereich: PhaseBereich;
          startDate: Date | undefined;
          endDate: Date | undefined;
          budgetHours: number | undefined;
          actualHours: number | undefined;
          description: string | undefined;
          projectAddress: string | undefined;
        }>;
      }>();

      for (const task of tasks) {
        // Überspringe abgeschlossene Tasks
        if (task.completed) {
          result.tasksSkipped++;
          continue;
        }

        const mappedPhase = this.asanaService.mapTaskToPhase(task, config, teamProjectGids);

        if (!mappedPhase) {
          // Task hat kein passendes Projekt im Team
          result.tasksSkipped++;
          continue;
        }

        // Zur Map hinzufügen
        if (!projectPhaseMap.has(mappedPhase.projectAsanaGid)) {
          projectPhaseMap.set(mappedPhase.projectAsanaGid, {
            projectName: mappedPhase.projectName,
            phases: [],
          });
        }

        projectPhaseMap.get(mappedPhase.projectAsanaGid)!.phases.push({
          asanaGid: mappedPhase.asanaGid,
          name: mappedPhase.name,
          bereich: mappedPhase.bereich,
          startDate: mappedPhase.startDate ?? undefined,
          endDate: mappedPhase.endDate ?? undefined,
          budgetHours: mappedPhase.budgetHours ?? undefined,
          actualHours: mappedPhase.actualHours ?? undefined,
          description: mappedPhase.description,
          projectAddress: mappedPhase.projectAddress,
        });
      }

      // 6. Projekte und Phasen synchronisieren
      for (const [projectAsanaGid, { projectName, phases }] of projectPhaseMap) {
        try {
          // Projekt finden oder erstellen
          let project = await this.projectRepository.findByAsanaGid(
            projectAsanaGid,
            tenantId
          );

          const now = new Date();

          // Adress-Validierung: Sammle alle Adressen der Phasen
          const addresses = phases
            .map((p) => p.projectAddress)
            .filter((a): a is string => !!a && a.trim().length > 0);
          const uniqueAddresses = [...new Set(addresses)];

          // Wenn alle Phasen dieselbe Adresse haben → nutze diese
          // Wenn unterschiedlich → addressConflict = true
          const projectAddress = uniqueAddresses.length === 1 ? uniqueAddresses[0] : undefined;
          const addressConflict = uniqueAddresses.length > 1;

          if (project) {
            // Update Projekt-Name, Adresse und Konflikt-Flag falls geändert
            const needsUpdate =
              project.name !== projectName ||
              project.address !== projectAddress ||
              project.addressConflict !== addressConflict;

            if (needsUpdate) {
              const updated = Project.create({
                ...project,
                name: projectName,
                address: projectAddress,
                addressConflict,
                syncedAt: now,
                updatedAt: now,
              });
              await this.projectRepository.update(updated);
            }
            result.projectsUpdated++;
          } else {
            // Neues Projekt erstellen
            project = Project.create({
              id: crypto.randomUUID(),
              tenantId,
              name: projectName,
              address: projectAddress,
              addressConflict,
              status: 'active',
              asanaGid: projectAsanaGid,
              syncedAt: now,
              createdAt: now,
              updatedAt: now,
            });
            await this.projectRepository.save(project);
            result.projectsCreated++;
          }

          // Geocoding für neue/geänderte Adressen (wenn Service verfügbar)
          if (this.geocodingService && project.address && !project.addressLat) {
            try {
              const geoResult = await this.geocodingService.geocode(project.address);
              if (geoResult) {
                const geocodedProject = project.withGeoLocation(geoResult.lat, geoResult.lng);
                await this.projectRepository.update(geocodedProject);
                // Update local reference for subsequent operations
                project = geocodedProject;
              }
            } catch (error) {
              console.warn('[SyncAsanaTaskPhases] Geocoding failed:', error instanceof Error ? error.message : 'Unknown error');
            }
          }

          // Phasen synchronisieren
          for (let i = 0; i < phases.length; i++) {
            const phaseData = phases[i];

            try {
              const existingPhase = await this.projectPhaseRepository.findByAsanaGid(
                phaseData.asanaGid,
                project.id
              );

              if (existingPhase) {
                // Update
                const updated = ProjectPhase.create({
                  ...existingPhase,
                  name: phaseData.name,
                  bereich: phaseData.bereich,
                  startDate: phaseData.startDate,
                  endDate: phaseData.endDate,
                  budgetHours: phaseData.budgetHours,
                  actualHours: phaseData.actualHours,
                  description: phaseData.description,
                  sortOrder: i,
                  updatedAt: now,
                });
                await this.projectPhaseRepository.update(updated);
                result.phasesUpdated++;
              } else {
                // Create
                const phase = ProjectPhase.create({
                  id: crypto.randomUUID(),
                  projectId: project.id,
                  tenantId,
                  name: phaseData.name,
                  bereich: phaseData.bereich,
                  startDate: phaseData.startDate,
                  endDate: phaseData.endDate,
                  budgetHours: phaseData.budgetHours,
                  actualHours: phaseData.actualHours,
                  description: phaseData.description,
                  sortOrder: i,
                  asanaGid: phaseData.asanaGid,
                  createdAt: now,
                  updatedAt: now,
                });
                await this.projectPhaseRepository.save(phase);
                result.phasesCreated++;
              }
            } catch (error) {
              result.errors.push(
                `Phase ${phaseData.name} für ${projectName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
              );
            }
          }
        } catch (error) {
          result.errors.push(
            `Projekt ${projectName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }

      // Erfolg
      result.success = true;

      // Sync-Log abschließen
      await this.syncLogRepository.update(syncLog.id, {
        status: 'success',
        result: {
          projectsCreated: result.projectsCreated,
          projectsUpdated: result.projectsUpdated,
          phasesCreated: result.phasesCreated,
          phasesUpdated: result.phasesUpdated,
          tasksSkipped: result.tasksSkipped,
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

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async getAccessToken(tenantId: string): Promise<string> {
    const credentials = await this.credentialsRepository.findByTenantId(tenantId);

    if (!credentials?.asanaAccessToken) {
      throw new Error('Asana ist nicht verbunden');
    }

    let accessToken = this.encryptionService.decrypt(credentials.asanaAccessToken);

    // Token abgelaufen? -> Refresh versuchen
    if (
      credentials.asanaTokenExpiresAt &&
      new Date(credentials.asanaTokenExpiresAt) <= new Date()
    ) {
      if (!credentials.asanaRefreshToken) {
        throw new Error('Token abgelaufen und kein Refresh Token vorhanden');
      }

      const refreshToken = this.encryptionService.decrypt(credentials.asanaRefreshToken);

      try {
        const newTokens = await this.asanaService.refreshAccessToken(refreshToken);
        accessToken = newTokens.access_token;

        // Neue Tokens speichern
        await this.credentialsRepository.update(tenantId, {
          asanaAccessToken: this.encryptionService.encrypt(newTokens.access_token),
          asanaRefreshToken: newTokens.refresh_token
            ? this.encryptionService.encrypt(newTokens.refresh_token)
            : null,
          asanaTokenExpiresAt: newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000)
            : null,
        });
      } catch {
        throw new Error('Token-Erneuerung fehlgeschlagen. Bitte erneut verbinden.');
      }
    }

    return accessToken;
  }

  private async getSyncConfig(tenantId: string): Promise<AsanaTaskSyncConfig> {
    const credentials = await this.credentialsRepository.findByTenantId(tenantId);

    if (!credentials?.asanaWorkspaceId) {
      throw new Error('Kein Asana Workspace konfiguriert');
    }

    if (!credentials.asanaSourceProjectId) {
      throw new Error('Kein Quell-Projekt konfiguriert. Bitte in den Einstellungen festlegen.');
    }

    if (!credentials.asanaTeamId) {
      throw new Error('Kein Team konfiguriert. Bitte in den Einstellungen festlegen.');
    }

    return {
      workspaceId: credentials.asanaWorkspaceId,
      sourceProjectId: credentials.asanaSourceProjectId,
      teamId: credentials.asanaTeamId,
      phaseTypeFieldId: credentials.asanaPhaseTypeFieldId ?? undefined,
      zuordnungFieldId: credentials.asanaZuordnungFieldId ?? undefined,
      sollStundenFieldId: credentials.asanaSollStundenFieldId ?? undefined,
      istStundenFieldId: credentials.asanaIstStundenFieldId ?? undefined,
      addressFieldId: credentials.asanaAddressFieldId ?? undefined,
    };
  }
}
