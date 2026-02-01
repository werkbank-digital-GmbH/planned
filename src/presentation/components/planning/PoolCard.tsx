'use client';

import { useDraggable } from '@dnd-kit/core';
import { Truck, User } from 'lucide-react';

import type { AvailabilityStatus, PoolItem } from '@/application/queries';

import { formatDateISO } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PoolCardProps {
  item: PoolItem;
  weekDates: Date[];
  compact?: boolean;
  /** Eindeutiger Kontext (z.B. "day-0", "KW5") um mehrere Karten für dasselbe Item zu unterscheiden */
  contextKey?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getAvailabilityColor(status: AvailabilityStatus): string {
  switch (status) {
    case 'available':
      return 'bg-green-500';
    case 'partial':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    case 'absence':
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
  }
}

function getWeekdayShort(date: Date): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days[date.getDay()];
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Draggable Karte für einen Mitarbeiter/Ressource im Pool.
 *
 * Zeigt:
 * - Name und Rolle/Typ
 * - Abwesenheits-Label (wenn vorhanden)
 * - 5 Verfügbarkeits-Punkte (Mo-Fr)
 */
export function PoolCard({ item, weekDates, compact = false, contextKey }: PoolCardProps) {
  // Eindeutige ID: Mit contextKey falls mehrere Karten für dasselbe Item existieren
  const draggableId = contextKey
    ? `pool-${item.type}-${item.id}-${contextKey}`
    : `pool-${item.type}-${item.id}`;

  // Filtere Wochenenden aus weekDates (nur Werktage Mo-Fr)
  const workDates = weekDates.filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6; // 0 = Sonntag, 6 = Samstag
  });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      type: 'pool-item',
      itemType: item.type,
      itemId: item.id,
      itemName: item.name,
      // Übergebe die Werktage als ISO-Strings für die Allocation-Erstellung
      dates: workDates.map((d) => formatDateISO(d)),
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  const isUser = item.type === 'user';

  // Kompakte Ansicht für Tages-/Wochenspalten
  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          'flex items-center gap-2 p-1.5 rounded border bg-white',
          'cursor-grab active:cursor-grabbing',
          'transition-shadow hover:shadow-sm',
          'select-none',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-blue-500',
          item.hasAbsence && 'border-red-200 bg-red-50/30'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0',
            isUser ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
          )}
        >
          {isUser ? <User className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
        </div>
        <span className="text-xs font-medium truncate">{item.name}</span>
      </div>
    );
  }

  // Standard-Ansicht mit allen Details
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex flex-col gap-1.5 p-2 rounded-lg border bg-white',
        'cursor-grab active:cursor-grabbing',
        'transition-shadow hover:shadow-md',
        'min-w-[120px] select-none',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-blue-500',
        item.hasAbsence && 'border-red-200'
      )}
    >
      {/* Header mit Icon und Name */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-full',
            isUser ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {isUser ? item.role : item.resourceType}
          </div>
        </div>
      </div>

      {/* Abwesenheits-Label */}
      {item.hasAbsence && item.absenceLabel && (
        <div className="text-xs text-red-600 font-medium">
          {item.absenceLabel}
        </div>
      )}

      {/* Verfügbarkeits-Indikatoren */}
      <div className="flex items-center justify-between gap-1">
        {weekDates.map((date, index) => {
          const availability = item.availability[index];
          const status = availability?.status ?? 'available';

          return (
            <div
              key={date.toISOString()}
              className="flex flex-col items-center gap-0.5"
              title={`${getWeekdayShort(date)}: ${getStatusLabel(status)}`}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  getAvailabilityColor(status)
                )}
              />
              <span className="text-[9px] text-gray-400">
                {getWeekdayShort(date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getStatusLabel(status: AvailabilityStatus): string {
  switch (status) {
    case 'available':
      return 'Verfügbar';
    case 'partial':
      return 'Teilweise gebucht';
    case 'busy':
      return 'Ausgelastet';
    case 'absence':
      return 'Abwesend';
    default:
      return 'Unbekannt';
  }
}
