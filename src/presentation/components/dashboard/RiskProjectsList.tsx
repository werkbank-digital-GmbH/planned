import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import type { RiskProjectDTO } from '@/presentation/actions/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface RiskProjectsListProps {
  projects: RiskProjectDTO[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    critical: {
      label: 'Kritisch',
      className: 'bg-red-100 text-red-700 border-red-200',
    },
    behind: {
      label: 'Im Verzug',
      className: 'bg-red-100 text-red-700 border-red-200',
    },
    at_risk: {
      label: 'Gefährdet',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK PROJECTS LIST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt die Top 3 Risiko-Projekte an.
 *
 * Jedes Projekt hat:
 * - Name (als Link zu /projekte/[id])
 * - Status-Badge (rot/gelb)
 * - Anzahl gefährdeter Phasen
 */
export function RiskProjectsList({ projects }: RiskProjectsListProps) {
  const hasProjects = projects.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Projekte mit Handlungsbedarf
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasProjects ? (
          <ul className="divide-y divide-gray-100">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projekte/${project.id}`}
                  className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500">
                      {project.phasesAtRisk}{' '}
                      {project.phasesAtRisk === 1 ? 'Phase' : 'Phasen'} gefährdet
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    {getStatusBadge(project.status)}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="mb-2 h-10 w-10 text-green-500" />
            <p className="font-medium text-gray-600">Keine Risiko-Projekte</p>
            <p className="text-sm text-gray-400">Alle Projekte sind im Plan</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
