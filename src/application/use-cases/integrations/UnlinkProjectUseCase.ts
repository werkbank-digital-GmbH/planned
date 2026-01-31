import { NotFoundError } from '@/domain/errors';

import { Result, type ActionResult } from '@/application/common/ActionResult';
import type { IProjectRepository } from '@/application/ports/repositories/IProjectRepository';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UnlinkProjectInput {
  projectId: string;
  tenantId: string;
}

export interface UnlinkProjectOutput {
  projectId: string;
  projectName: string;
}

export type UnlinkProjectResult = ActionResult<UnlinkProjectOutput>;

// ═══════════════════════════════════════════════════════════════════════════
// USE CASE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Use Case: Entfernt die Asana-Verknüpfung eines Projekts.
 *
 * Das Projekt bleibt in Planned erhalten, wird aber nicht mehr
 * mit Asana synchronisiert. Alle Allocations und Phasen bleiben bestehen.
 */
export class UnlinkProjectUseCase {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async execute(input: UnlinkProjectInput): Promise<UnlinkProjectResult> {
    try {
      // Projekt laden
      const project = await this.projectRepository.findById(input.projectId);

      if (!project) {
        throw new NotFoundError('Project', input.projectId);
      }

      // Tenant prüfen
      if (project.tenantId !== input.tenantId) {
        return Result.fail('FORBIDDEN', 'Keine Berechtigung für dieses Projekt');
      }

      // Prüfen ob überhaupt eine Asana-Verknüpfung besteht
      if (!project.asanaGid) {
        return Result.fail(
          'NOT_LINKED',
          'Projekt ist nicht mit Asana verknüpft'
        );
      }

      // Asana-Verknüpfung entfernen
      const unlinkedProject = project.withoutAsanaLink();
      await this.projectRepository.update(unlinkedProject);

      return Result.ok({
        projectId: project.id,
        projectName: project.name,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return Result.fail('NOT_FOUND', error.message);
      }
      return Result.fail(
        'UNLINK_PROJECT_FAILED',
        error instanceof Error ? error.message : 'Unbekannter Fehler'
      );
    }
  }
}
