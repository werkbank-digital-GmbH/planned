import type { ActionResult } from '@/application/common';
import { Result } from '@/application/common';
import type { IAsanaService } from '@/application/ports/services/IAsanaService';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UpdateAsanaPhaseRequest {
  phaseId: string;
  tenantId: string;
  updates: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    budgetHours?: number;
  };
}

export interface UpdateAsanaPhaseResult {
  synced: boolean;
  asanaGid?: string;
}

export interface IPhaseRepository {
  findById(id: string): Promise<PhaseWithProject | null>;
  update(id: string, data: Partial<PhaseData>): Promise<void>;
}

export interface IIntegrationCredentialsRepository {
  findByTenantId(tenantId: string): Promise<IntegrationCredentials | null>;
  update(tenantId: string, data: Partial<IntegrationCredentials>): Promise<void>;
}

interface PhaseWithProject {
  id: string;
  tenantId: string;
  projectId: string;
  asanaGid?: string;
  name: string;
  startDate?: Date;
  endDate?: Date;
  budgetHours: number;
  project: {
    id: string;
    asanaGid?: string;
  };
}

interface PhaseData {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  budgetHours?: number;
  updatedAt: Date;
}

interface IntegrationCredentials {
  asanaAccessToken?: string;
  asanaRefreshToken?: string;
  asanaTokenExpiresAt?: Date;
  asanaPhaseBudgetHoursFieldId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UpdateAsanaPhaseUseCase
 *
 * Aktualisiert eine Phase sowohl in der lokalen Datenbank als auch in Asana.
 * Implementiert "Last-Write-Wins" Strategie für bidirektionale Sync.
 *
 * Ablauf:
 * 1. Phase aus DB laden (mit Projekt für Asana-GIDs)
 * 2. Lokale Datenbank aktualisieren
 * 3. Wenn Asana-GID vorhanden, auch in Asana aktualisieren
 * 4. Sync-Log erstellen
 */
export class UpdateAsanaPhaseUseCase {
  constructor(
    private readonly phaseRepository: IPhaseRepository,
    private readonly credentialsRepository: IIntegrationCredentialsRepository,
    private readonly asanaService: IAsanaService
  ) {}

  async execute(request: UpdateAsanaPhaseRequest): Promise<ActionResult<UpdateAsanaPhaseResult>> {
    const { phaseId, tenantId, updates } = request;

    try {
      // 1. Phase laden
      const phase = await this.phaseRepository.findById(phaseId);

      if (!phase) {
        return Result.fail('PHASE_NOT_FOUND', 'Phase nicht gefunden');
      }

      if (phase.tenantId !== tenantId) {
        return Result.fail('UNAUTHORIZED', 'Keine Berechtigung für diese Phase');
      }

      // 2. Lokale DB aktualisieren
      await this.phaseRepository.update(phaseId, {
        ...updates,
        updatedAt: new Date(),
      });

      // 3. Asana-Sync (wenn verbunden)
      if (!phase.asanaGid) {
        // Keine Asana-Verbindung für diese Phase
        return Result.ok({ synced: false });
      }

      const credentials = await this.credentialsRepository.findByTenantId(tenantId);

      if (!credentials?.asanaAccessToken) {
        // Keine Asana-Credentials vorhanden
        return Result.ok({ synced: false, asanaGid: phase.asanaGid });
      }

      // Access Token prüfen/erneuern
      let accessToken = credentials.asanaAccessToken;

      if (credentials.asanaTokenExpiresAt && credentials.asanaTokenExpiresAt < new Date()) {
        // Token abgelaufen, erneuern
        if (!credentials.asanaRefreshToken) {
          return Result.ok({ synced: false, asanaGid: phase.asanaGid });
        }

        try {
          const newTokens = await this.asanaService.refreshAccessToken(credentials.asanaRefreshToken);
          accessToken = newTokens.access_token;

          // Neue Tokens in DB speichern
          const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
          await this.credentialsRepository.update(tenantId, {
            asanaAccessToken: newTokens.access_token,
            asanaRefreshToken: newTokens.refresh_token,
            asanaTokenExpiresAt: expiresAt,
          });
        } catch (error) {
          console.warn('[UpdateAsanaPhase] Token refresh failed:', error instanceof Error ? error.message : 'Unknown error');
          return Result.ok({ synced: false, asanaGid: phase.asanaGid });
        }
      }

      // 4. Asana aktualisieren

      // Section-Name aktualisieren (wenn geändert)
      if (updates.name) {
        await this.asanaService.updateSection(
          phase.asanaGid,
          { name: updates.name },
          accessToken
        );
      }

      // Budget-Stunden als Custom Field aktualisieren (wenn konfiguriert und geändert)
      if (
        updates.budgetHours !== undefined &&
        credentials.asanaPhaseBudgetHoursFieldId &&
        phase.project.asanaGid
      ) {
        await this.asanaService.updateProjectCustomField(
          phase.project.asanaGid,
          credentials.asanaPhaseBudgetHoursFieldId,
          updates.budgetHours,
          accessToken
        );
      }

      // Hinweis: Asana Sections haben keine nativen Start/End-Daten
      // Diese werden nur lokal in planned. gespeichert

      return Result.ok({
        synced: true,
        asanaGid: phase.asanaGid,
      });
    } catch (error) {
      console.error('[UpdateAsanaPhaseUseCase] Error:', error);

      return Result.fail(
        'SYNC_ERROR',
        error instanceof Error ? error.message : 'Sync fehlgeschlagen'
      );
    }
  }
}
