import { Project } from '@/domain/entities/Project';
import { ProjectPhase } from '@/domain/entities/ProjectPhase';
import type { PhaseBereich } from '@/domain/types';

import type {
  IIntegrationCredentialsRepository,
  IProjectPhaseRepository,
  IProjectRepository,
  ISyncLogRepository,
} from '@/application/ports/repositories';
import type { AsanaSyncConfig, IAsanaService } from '@/application/ports/services';
import type { IEncryptionService } from '@/application/ports/services/IEncryptionService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  success: boolean;
  projectsCreated: number;
  projectsUpdated: number;
  projectsArchived: number;
  phasesCreated: number;
  phasesUpdated: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Synchronisiert Projekte und Phasen aus Asana.
 *
 * Prozess:
 * 1. Credentials laden und entschlüsseln
 * 2. Projekte von Asana laden
 * 3. Für jedes Projekt: Create oder Update
 * 4. Sections als Phasen synchronisieren
 * 5. Nicht mehr vorhandene Projekte archivieren
 * 6. Sync-Log erstellen
 */
export class SyncAsanaProjectsUseCase {
  constructor(
    private readonly asanaService: IAsanaService,
    private readonly projectRepository: IProjectRepository,
    private readonly projectPhaseRepository: IProjectPhaseRepository,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly syncLogRepository: ISyncLogRepository,
    private readonly encryptionService: IEncryptionService
  ) {}

  async execute(tenantId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      projectsCreated: 0,
      projectsUpdated: 0,
      projectsArchived: 0,
      phasesCreated: 0,
      phasesUpdated: 0,
      errors: [],
    };

    // Sync-Log starten
    const syncLog = await this.syncLogRepository.create({
      tenantId,
      service: 'asana',
      operation: 'sync_projects',
      status: 'running',
    });

    try {
      // 1. Credentials laden und entschlüsseln
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

        const refreshToken = this.encryptionService.decrypt(
          credentials.asanaRefreshToken
        );

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

      // 2. Sync-Config erstellen
      const config: AsanaSyncConfig = {
        workspaceId: credentials.asanaWorkspaceId ?? '',
        projectNumberFieldId: credentials.asanaProjectStatusFieldId ?? undefined,
        sollProduktionFieldId: credentials.asanaSollProduktionFieldId ?? undefined,
        sollMontageFieldId: credentials.asanaSollMontageFieldId ?? undefined,
        phaseBereichFieldId: credentials.asanaPhaseBereichFieldId ?? undefined,
        phaseBudgetHoursFieldId: credentials.asanaPhaseBudgetHoursFieldId ?? undefined,
      };

      if (!config.workspaceId) {
        throw new Error('Kein Asana Workspace konfiguriert');
      }

      // 3. Projekte von Asana laden
      const asanaProjects = await this.asanaService.getProjects(
        config.workspaceId,
        accessToken
      );

      // 4. Sync durchführen
      const asanaGids = new Set<string>();

      for (const asanaProject of asanaProjects) {
        asanaGids.add(asanaProject.gid);

        try {
          // Existierendes Projekt suchen
          const existing = await this.projectRepository.findByAsanaGid(
            asanaProject.gid,
            tenantId
          );

          // Projekt-Daten mappen
          const mappedProject = this.asanaService.mapToProject(asanaProject, config);

          const now = new Date();

          if (existing) {
            // Update
            // Archivierte Projekte bekommen Status 'completed'
            const updated = Project.create({
              ...existing,
              name: mappedProject.name,
              status: mappedProject.isArchived ? 'completed' : existing.status,
              asanaGid: mappedProject.asanaGid,
              syncedAt: now,
              updatedAt: now,
            });
            await this.projectRepository.update(updated);
            result.projectsUpdated++;

            // Phasen synchronisieren
            await this.syncPhases(
              existing.id,
              tenantId,
              asanaProject.gid,
              accessToken,
              config,
              result
            );
          } else {
            // Create
            // Archivierte Projekte bekommen Status 'completed'
            const project = Project.create({
              id: crypto.randomUUID(),
              tenantId,
              name: mappedProject.name,
              status: mappedProject.isArchived ? 'completed' : 'active',
              asanaGid: mappedProject.asanaGid,
              syncedAt: now,
              createdAt: now,
              updatedAt: now,
            });
            await this.projectRepository.save(project);
            result.projectsCreated++;

            // Phasen synchronisieren
            await this.syncPhases(
              project.id,
              tenantId,
              asanaProject.gid,
              accessToken,
              config,
              result
            );
          }
        } catch (error) {
          result.errors.push(
            `Projekt ${asanaProject.name}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          );
        }
      }

      // 5. Nicht mehr vorhandene Projekte archivieren (als 'completed' markieren)
      const localProjects = await this.projectRepository.findAllByTenant(tenantId);
      for (const local of localProjects) {
        if (local.asanaGid && !asanaGids.has(local.asanaGid) && local.status !== 'completed') {
          await this.projectRepository.updateStatus(local.id, 'completed');
          result.projectsArchived++;
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
          projectsArchived: result.projectsArchived,
          phasesCreated: result.phasesCreated,
          phasesUpdated: result.phasesUpdated,
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
   * Synchronisiert Phasen (Sections) eines Projekts.
   */
  private async syncPhases(
    projectId: string,
    tenantId: string,
    asanaProjectGid: string,
    accessToken: string,
    config: AsanaSyncConfig,
    result: SyncResult
  ): Promise<void> {
    try {
      const sections = await this.asanaService.getSections(asanaProjectGid, accessToken);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const mappedPhase = this.asanaService.mapSectionToPhase(section, config);

        // Existierende Phase suchen
        const existing = await this.projectPhaseRepository.findByAsanaGid(
          section.gid,
          projectId
        );

        const now = new Date();

        if (existing) {
          // Update
          const updated = ProjectPhase.create({
            ...existing,
            name: mappedPhase.name,
            bereich: mappedPhase.bereich as PhaseBereich,
            budgetHours: mappedPhase.budgetHours,
            sortOrder: i,
            updatedAt: now,
          });
          await this.projectPhaseRepository.update(updated);
          result.phasesUpdated++;
        } else {
          // Create
          const phase = ProjectPhase.create({
            id: crypto.randomUUID(),
            projectId,
            tenantId,
            name: mappedPhase.name,
            bereich: mappedPhase.bereich as PhaseBereich,
            sortOrder: i,
            budgetHours: mappedPhase.budgetHours,
            asanaGid: mappedPhase.asanaGid,
            createdAt: now,
            updatedAt: now,
          });
          await this.projectPhaseRepository.save(phase);
          result.phasesCreated++;
        }
      }
    } catch (error) {
      result.errors.push(
        `Phasen-Sync für Projekt ${projectId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      );
    }
  }
}
