'use client';

import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import type { ProjectDetailsDTO } from '@/presentation/actions/project-details';
import { Badge } from '@/presentation/components/ui/badge';
import { Button } from '@/presentation/components/ui/button';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectDetailsHeaderProps {
  project: ProjectDetailsDTO;
}

// Status-Badge Styles
const STATUS_STYLES: Record<
  ProjectDetailsDTO['status'],
  { bg: string; text: string; label: string }
> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'AKTIV' },
  planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'GEPLANT' },
  paused: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'PAUSIERT' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'FERTIG' },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Header der Projekt-Detailseite.
 *
 * Zeigt:
 * - Zurück-Link
 * - Gradient-Hintergrund mit Projektname
 * - Status-Badge
 * - Links zu Asana und Drive
 */
export function ProjectDetailsHeader({ project }: ProjectDetailsHeaderProps) {
  const statusStyle = STATUS_STYLES[project.status];

  return (
    <div className="space-y-4">
      {/* Back Link */}
      <Link
        href="/projekte"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Projekte
      </Link>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 p-8 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Status Badge */}
          <div className="flex items-center gap-3 mb-4">
            <Badge
              className={cn(
                'font-medium',
                statusStyle.bg,
                statusStyle.text,
                'hover:bg-opacity-100'
              )}
            >
              {statusStyle.label}
            </Badge>
            {project.asanaGid && (
              <span className="text-gray-400 text-sm">#{project.asanaGid.slice(-5)}</span>
            )}
          </div>

          {/* Project Name */}
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{project.name}</h1>

          {/* Address */}
          {project.address && (
            <p className="text-gray-300 text-sm mb-4">{project.address}</p>
          )}

          {/* External Links */}
          <div className="flex flex-wrap gap-3">
            {project.asanaUrl && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                asChild
              >
                <a
                  href={project.asanaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  In Asana öffnen
                </a>
              </Button>
            )}
            {project.driveFolderUrl && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                asChild
              >
                <a
                  href={project.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Drive-Ordner
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
