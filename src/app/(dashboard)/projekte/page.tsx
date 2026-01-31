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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projekte</h1>
      </div>

      {/* Filter und Grid */}
      <ProjectsFilter projects={projects} />
    </div>
  );
}
