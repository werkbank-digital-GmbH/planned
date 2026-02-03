'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { ProjectInsightDTO } from '@/presentation/actions/insights';
import { getProjectInsightsAction } from '@/presentation/actions/insights';
import type { ProjectDetailsDTO } from '@/presentation/actions/project-details';
import { getProjectDetailsAction } from '@/presentation/actions/project-details';
import {
  ProjectDetailsHeader,
  ProjectInsightsSection,
  ProjectPhasesSection,
  ProjectStatsGrid,
} from '@/presentation/components/project-details';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/ui/dialog';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ProjectDetailModalProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ModalData {
  project: ProjectDetailsDTO | null;
  insights: ProjectInsightDTO | null;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Modal zur Anzeige von Projekt-Details in der Planungsansicht.
 *
 * Features:
 * - Fast fullscreen (max-w-4xl, max-h-[90vh])
 * - Scrollbar bei Overflow
 * - Lädt Daten beim Öffnen (nicht vorher)
 * - Zeigt: Header, Stats, Insights, Phases
 * - Schließt via X, Escape, Backdrop
 */
export function ProjectDetailModal({
  projectId,
  isOpen,
  onClose,
}: ProjectDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ModalData>({
    project: null,
    insights: null,
    error: null,
  });

  // Lade Daten wenn Modal öffnet
  const loadData = useCallback(async (id: string) => {
    setIsLoading(true);
    setData({ project: null, insights: null, error: null });

    try {
      // Lade beide parallel
      const [projectResult, insightsResult] = await Promise.all([
        getProjectDetailsAction(id),
        getProjectInsightsAction(id),
      ]);

      if (!projectResult.success) {
        setData({
          project: null,
          insights: null,
          error: projectResult.error.message,
        });
        return;
      }

      setData({
        project: projectResult.data!,
        insights: insightsResult.success ? insightsResult.data! : null,
        error: null,
      });
    } catch (err) {
      setData({
        project: null,
        insights: null,
        error: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && projectId) {
      loadData(projectId);
    }
  }, [isOpen, projectId, loadData]);

  // Reset wenn Modal schließt
  useEffect(() => {
    if (!isOpen) {
      setData({ project: null, insights: null, error: null });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Hidden DialogTitle for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            {data.project?.name ?? 'Projekt-Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Lade Projekt-Details...</span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && data.error && (
            <div className="p-6">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
                {data.error}
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && data.project && (
            <div className="space-y-6 p-6">
              {/* Header */}
              <ProjectDetailsHeader project={data.project} />

              {/* Stats Grid */}
              <ProjectStatsGrid project={data.project} />

              {/* KI-Insights Section */}
              {data.insights && (
                <ProjectInsightsSection
                  projectInsight={data.insights.projectInsight}
                  phaseInsights={data.insights.phaseInsights}
                  generatedAt={data.insights.generatedAt}
                />
              )}

              {/* Phases Section */}
              <ProjectPhasesSection
                phases={data.project.phases}
                asanaUrl={data.project.asanaUrl}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
