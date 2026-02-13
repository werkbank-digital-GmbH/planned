import { getProjectsOverviewAction } from '@/presentation/actions/projects';
import { ProjectsFilter } from '@/presentation/components/projects/ProjectsFilter';

/**
 * Projektübersicht
 *
 * Zeigt alle Projekte als Karten mit:
 * - Status, Fortschritt, Stunden
 * - Filter und Suche
 * - Link zu Projektdetails
 */
export default async function ProjektePage() {
  const result = await getProjectsOverviewAction();
  const projects = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <ProjectsFilter projects={projects} />
    </div>
  );
}
