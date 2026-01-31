'use client';

import { AlertTriangle } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';

import {
  getUnresolvedConflicts,
  resolveConflict,
} from '@/presentation/actions/conflicts';
import { Badge } from '@/presentation/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/presentation/components/ui/popover';

import type { ConflictResolution } from '@/lib/database.types';

import { ConflictList, type ConflictItem } from './ConflictList';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ConflictBadgeProps {
  /** Initial conflicts count (optional, for SSR) */
  initialCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Badge im Header der zeigt Anzahl ungelöster Abwesenheits-Konflikte.
 *
 * Beim Klick öffnet sich ein Popover mit der Konflikt-Liste.
 */
export function ConflictBadge({
  initialCount = 0,
}: ConflictBadgeProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [count, setCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastFetch, setLastFetch] = useState<number>(0);

  /**
   * Lädt die Konflikte vom Server.
   */
  const fetchConflicts = useCallback(async () => {
    const now = Date.now();

    // Rate limiting: mindestens 5 Sekunden zwischen Requests
    if (now - lastFetch < 5000) {
      return;
    }

    setLastFetch(now);

    const result = await getUnresolvedConflicts();

    if (result.success && result.data) {
      setConflicts(
        result.data.conflicts.map((c) => ({
          id: c.id,
          userName: c.userName,
          date: c.date,
          absenceType: c.absenceType,
        }))
      );
      setCount(result.data.total);
    }
  }, [lastFetch]);

  /**
   * Handler für Popover-Öffnung - lädt Konflikte.
   */
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      startTransition(() => {
        fetchConflicts();
      });
    }
  };

  /**
   * Handler für Konflikt-Auflösung.
   */
  const handleResolve = useCallback(
    (conflictId: string, resolution: ConflictResolution) => {
      startTransition(async () => {
        // Für 'moved' würden wir hier eigentlich einen Dialog öffnen
        // um das neue Datum zu wählen. Vorerst löschen wir einfach.
        const result = await resolveConflict(conflictId, resolution);

        if (result.success) {
          // Optimistic update: Konflikt aus Liste entfernen
          setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
          setCount((prev) => Math.max(0, prev - 1));
        }
      });
    },
    []
  );

  // Periodisches Refresh wenn Popover offen
  // (In Produktion würde man hier react-query oder SWR verwenden)

  // Nichts anzeigen wenn keine Konflikte
  if (count === 0 && !isPending) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-md p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={`${count} Planungskonflikte`}
        >
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-3">
          <h3 className="font-medium">Planungskonflikte</h3>
          <p className="text-xs text-gray-500">
            {count} {count === 1 ? 'Allocation' : 'Allocations'} mit
            Abwesenheits-Überschneidung
          </p>
        </div>
        <ConflictList
          conflicts={conflicts}
          onResolve={handleResolve}
          isResolving={isPending}
        />
      </PopoverContent>
    </Popover>
  );
}
