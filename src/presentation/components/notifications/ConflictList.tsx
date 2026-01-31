'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { ArrowRight, Trash2, X } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';

import type { AbsenceType, ConflictResolution } from '@/lib/database.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConflictItem {
  id: string;
  userName: string;
  date: string;
  absenceType: AbsenceType;
}

interface ConflictListProps {
  conflicts: ConflictItem[];
  onResolve: (id: string, resolution: ConflictResolution) => void;
  isResolving?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Urlaub',
  sick: 'Krank',
  holiday: 'Feiertag',
  training: 'Schulung',
  other: 'Sonstiges',
};

const ABSENCE_COLORS: Record<AbsenceType, string> = {
  vacation: 'bg-blue-100 text-blue-800',
  sick: 'bg-red-100 text-red-800',
  holiday: 'bg-green-100 text-green-800',
  training: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Liste von Abwesenheits-Konflikten mit Aktions-Buttons.
 */
export function ConflictList({ conflicts, onResolve, isResolving }: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">Keine Konflikte</div>
    );
  }

  return (
    <div className="max-h-80 overflow-auto">
      {conflicts.map((conflict) => (
        <div
          key={conflict.id}
          className="flex items-center justify-between border-b p-3 hover:bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{conflict.userName}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {format(new Date(conflict.date), 'EEE, dd.MM.yyyy', { locale: de })}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${ABSENCE_COLORS[conflict.absenceType]}`}
              >
                {ABSENCE_LABELS[conflict.absenceType]}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onResolve(conflict.id, 'deleted')}
              disabled={isResolving}
              title="Allocation löschen"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onResolve(conflict.id, 'moved')}
              disabled={isResolving}
              title="Allocation verschieben"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onResolve(conflict.id, 'ignored')}
              disabled={isResolving}
              title="Ignorieren"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
