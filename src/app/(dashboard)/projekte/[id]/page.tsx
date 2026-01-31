import { notFound } from 'next/navigation';

import { getProjectDetailsAction } from '@/presentation/actions/project-details';
import {
  ProjectDetailsHeader,
  ProjectPhasesSection,
  ProjectStatsGrid,
} from '@/presentation/components/project-details';

/**
 * Projekt-Detailseite
 *
 * Zeigt alle Details eines Projekts:
 * - Header mit Status, Name, Links
 * - Statistik-Karten (Fortschritt, Soll, IST)
 * - Phasen-Liste mit allen Details
 */
export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProjectDetailsAction(id);

  if (!result.success) {
    notFound();
  }

  const project = result.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <ProjectDetailsHeader project={project} />

      {/* Stats Grid */}
      <ProjectStatsGrid project={project} />

      {/* Phases Section */}
      <ProjectPhasesSection
        phases={project.phases}
        asanaUrl={project.asanaUrl}
      />
    </div>
  );
}
