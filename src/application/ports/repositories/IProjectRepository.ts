import type { Project } from '@/domain/entities/Project';
import type { ProjectPhase } from '@/domain/entities/ProjectPhase';
import type { ProjectStatus } from '@/domain/types';

/**
 * Projekt mit Phasen (für findWithPhases)
 */
export interface ProjectWithPhases {
  project: Project;
  phases: ProjectPhase[];
}

/**
 * Repository Interface für Project-Operationen.
 *
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseProjectRepository).
 * Die Application-Schicht kennt nur dieses Interface, nicht die Implementierung.
 *
 * WICHTIG: Keine create()-Methode - Projekte kommen aus Asana!
 */
export interface IProjectRepository {
  /**
   * Findet ein Projekt anhand seiner ID.
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Findet ein Projekt anhand seiner Asana GID innerhalb eines Tenants.
   */
  findByAsanaGid(gid: string, tenantId: string): Promise<Project | null>;

  /**
   * Findet alle Projekte eines Tenants.
   */
  findAllByTenant(tenantId: string): Promise<Project[]>;

  /**
   * Findet aktive Projekte eines Tenants.
   */
  findActiveByTenant(tenantId: string): Promise<Project[]>;

  /**
   * Findet ein Projekt mit allen zugehörigen Phasen.
   */
  findWithPhases(id: string): Promise<ProjectWithPhases | null>;

  /**
   * Speichert ein Projekt (für Asana-Sync).
   * Wird nur vom Asana-Sync-Service verwendet.
   */
  save(project: Project): Promise<Project>;

  /**
   * Aktualisiert ein Projekt.
   */
  update(project: Project): Promise<Project>;

  /**
   * Aktualisiert nur den Status eines Projekts.
   */
  updateStatus(id: string, status: ProjectStatus): Promise<void>;

  /**
   * Löscht ein Projekt (Hard Delete).
   * Normalerweise nur für Sync-Bereinigung verwendet.
   */
  delete(id: string): Promise<void>;
}
