'use client';

import { CalendarDays, CalendarRange } from 'lucide-react';

import { usePlanning, type ViewMode } from '@/presentation/contexts/PlanningContext';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ViewModeOption {
  value: ViewMode;
  label: string;
  icon: React.ReactNode;
}

const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    value: 'week',
    label: 'Wochenansicht',
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    value: 'month',
    label: 'Monatsansicht',
    icon: <CalendarRange className="h-4 w-4" />,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Umschalter zwischen Wochen- und Monatsansicht.
 *
 * Zeigt zwei Buttons in einem Toggle-Group-Stil:
 * - Wochenansicht (aktiv: zeigt Mo-Fr)
 * - Monatsansicht (zeigt alle Tage des Monats)
 */
export function ViewModeToggle() {
  const { viewMode, setViewMode } = usePlanning();

  return (
    <div className="flex items-center gap-1 p-1 bg-white rounded-lg border shadow-sm">
      {VIEW_MODE_OPTIONS.map((option) => {
        const isActive = viewMode === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setViewMode(option.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            aria-pressed={isActive}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
