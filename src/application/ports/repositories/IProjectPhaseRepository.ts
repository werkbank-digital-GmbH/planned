import type { ProjectPhase } from '@/domain/entities/ProjectPhase';
import type { PhaseBereich, PhaseStatus } from '@/domain/types';

/**
 * Repository Interface für ProjectPhase-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseProjectPhaseRepository).
 * Die Application-Schicht kennt nur dieses Interface, nicht die Implementierung.
 *
 * WICHTIG: Keine create()-Methode - Phasen kommen aus Asana!
 */
export interface IProjectPhaseRepository {
  /**
   * Findet eine Phase anhand ihrer ID.
   */
  findById(id: string): Promise<ProjectPhase | null>;

  /**
   * Findet mehrere Phasen anhand ihrer IDs.
   */
  findByIds(ids: string[]): Promise<ProjectPhase[]>;

  /**
   * Findet mehrere Phasen mit Projekt-Daten.
   * Wird für die Wochenansicht benötigt.
   */
  findByIdsWithProject(ids: string[]): Promise<
    Array<{
      id: string;
      name: string;
      bereich: string;
      project: { id: string; name: string; projectNumber?: string };
    }>
  >;

  /**
   * Findet eine Phase anhand ihrer Asana GID.
   */
  findByAsanaGid(gid: string, projectId: string): Promise<ProjectPhase | null>;

  /**
   * Findet alle Phasen eines Projekts.
   */
  findAllByProject(projectId: string): Promise<ProjectPhase[]>;

  /**
   * Findet alle aktiven Phasen eines Projekts (nicht gelöscht).
   */
  findActiveByProject(projectId: string): Promise<ProjectPhase[]>;

  /**
   * Findet Phasen nach Bereich.
   */
  findByBereich(projectId: string, bereich: PhaseBereich): Promise<ProjectPhase[]>;

  /**
   * Findet Phasen die zum Hard-Delete bereit sind (deleted_at > 90 Tage).
   */
  findReadyForHardDelete(tenantId: string): Promise<ProjectPhase[]>;

  /**
   * Speichert eine Phase (für Asana-Sync).
   * Wird nur vom Asana-Sync-Service verwendet.
   */
  save(phase: ProjectPhase): Promise<ProjectPhase>;

  /**
   * Aktualisiert eine Phase.
   */
  update(phase: ProjectPhase): Promise<ProjectPhase>;

  /**
   * Aktualisiert nur den Status einer Phase (Soft-Delete).
   */
  updateStatus(id: string, status: PhaseStatus): Promise<void>;

  /**
   * Aktualisiert die Datumsfelder einer Phase.
   * Wird verwendet wenn Allocations außerhalb des aktuellen Zeitraums erstellt werden.
   */
  updateDates(id: string, dates: { startDate?: Date; endDate?: Date }): Promise<void>;

  /**
   * Hard-Delete einer Phase.
   * Nur für Phasen verwenden die bereits soft-deleted sind.
   */
  delete(id: string): Promise<void>;

  /**
   * Bulk-Delete für Cleanup (Phasen > 90 Tage gelöscht).
   */
  deleteMany(ids: string[]): Promise<void>;
}
