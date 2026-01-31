import { FolderKanban } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardProjectSummary {
  id: string;
  name: string;
  hoursThisWeek: number;
  phaseName?: string;
}

interface TopProjectsCardProps {
  projects: DashboardProjectSummary[];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt die Top 5 Projekte nach geplanten Stunden.
 *
 * Features:
 * - Projektname mit Phasenname
 * - Geplante Stunden diese Woche
 * - Balkenvisualisierung
 */
export function TopProjectsCard({ projects }: TopProjectsCardProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Top Projekte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-sm text-gray-500">
            Keine Projekte diese Woche geplant.
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxHours = Math.max(...projects.map((p) => p.hoursThisWeek));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Top Projekte diese Woche
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project, index) => {
            const barWidth = maxHours > 0 ? (project.hoursThisWeek / maxHours) * 100 : 0;

            return (
              <div key={project.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="font-medium">{project.name}</span>
                    {project.phaseName && (
                      <span className="text-gray-400">→ {project.phaseName}</span>
                    )}
                  </div>
                  <span className="font-medium">{project.hoursThisWeek}h</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
