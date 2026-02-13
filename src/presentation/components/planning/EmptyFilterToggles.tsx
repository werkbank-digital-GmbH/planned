'use client';

import { EyeOff, FolderOpen, Layers } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/ui/tooltip';
import { useEmptyFilter } from '@/presentation/contexts/EmptyFilterContext';
import { usePlanning } from '@/presentation/contexts/PlanningContext';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Toggle-Buttons zum Ausblenden leerer Projekte und Phasen.
 *
 * - "Leere Projekte" = Projekte ohne Allocations in der aktuellen Periode
 * - "Leere Phasen" = Inaktive Phasen oder Phasen ohne Allocations
 *
 * Nur in Wochen- und Monatsansicht sichtbar (nicht in Team-View).
 */
export function EmptyFilterToggles() {
  const { viewMode } = usePlanning();
  const {
    hideEmptyProjects,
    hideEmptyPhases,
    toggleHideEmptyProjects,
    toggleHideEmptyPhases,
  } = useEmptyFilter();

  // Nicht in Team-View anzeigen
  if (viewMode === 'team') return null;

  return (
    <div className="flex items-center gap-1 p-1 bg-white rounded-lg border shadow-sm">
      <ToggleButton
        isActive={hideEmptyProjects}
        onClick={toggleHideEmptyProjects}
        icon={<FolderOpen className="h-4 w-4" />}
        activeIcon={<EyeOff className="h-4 w-4" />}
        label="Leere Projekte"
      />
      <ToggleButton
        isActive={hideEmptyPhases}
        onClick={toggleHideEmptyPhases}
        icon={<Layers className="h-4 w-4" />}
        activeIcon={<EyeOff className="h-4 w-4" />}
        label="Leere Phasen"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface ToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
}

function ToggleButton({ isActive, onClick, icon, activeIcon, label }: ToggleButtonProps) {
  const tooltipText = isActive ? `${label} einblenden` : `${label} ausblenden`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors',
            isActive
              ? 'bg-gray-100 text-gray-900'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
          aria-pressed={isActive}
        >
          {isActive ? activeIcon : icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
