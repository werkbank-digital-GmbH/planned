'use client';

import { Plane, HeartPulse, GraduationCap, Calendar } from 'lucide-react';

import { cn } from '@/lib/utils';

// Abwesenheitstypen mit Icons
const ABSENCE_CONFIG: Record<string, { label: string; icon: typeof Plane; className: string }> = {
  Urlaub: {
    label: 'Urlaub',
    icon: Plane,
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  Krankheit: {
    label: 'Krank',
    icon: HeartPulse,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  Fortbildung: {
    label: 'Fortbildung',
    icon: GraduationCap,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Sonstiges: {
    label: 'Abwesend',
    icon: Calendar,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
};

interface AbsenceOverlayProps {
  /** Art der Abwesenheit */
  type: string;
  /** Ob nur Icon angezeigt werden soll */
  compact?: boolean;
}

/**
 * Abwesenheits-Overlay für eine Zelle.
 *
 * Zeigt visuell an, dass der Mitarbeiter abwesend ist.
 */
export function AbsenceOverlay({ type, compact = false }: AbsenceOverlayProps) {
  const config = ABSENCE_CONFIG[type] ?? ABSENCE_CONFIG.Sonstiges;
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex h-full items-center justify-center rounded border',
          config.className
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[80px] flex-col items-center justify-center gap-1 rounded border',
        config.className
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}
