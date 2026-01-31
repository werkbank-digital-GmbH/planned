'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import type { AllocationWithDetails } from '@/application/queries';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CLIPBOARD_KEY = 'planned_allocation_clipboard';
const CLIPBOARD_EXPIRY_MS = 60 * 60 * 1000; // 1 Stunde

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ClipboardAllocation {
  projectPhaseId: string;
  projectId: string;
  projectName: string;
  phaseName: string;
  plannedHours: number;
  notes?: string;
  sourceDate: string;
  sourceUserId?: string;
  sourceResourceId?: string;
  copiedAt: string;
}

export interface CreateAllocationInput {
  projectPhaseId: string;
  userId?: string;
  resourceId?: string;
  date: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Allocation Clipboard-Funktionalität.
 *
 * Features:
 * - Kopieren von Allocations in localStorage
 * - Einfügen mit automatischer Allocation-Erstellung
 * - Automatisches Verfallen nach 1 Stunde
 * - Toast-Feedback für Benutzeraktionen
 *
 * @example
 * ```typescript
 * const { copy, paste, hasClipboard } = useAllocationClipboard();
 *
 * // Kopieren
 * copy(selectedAllocation);
 *
 * // Einfügen
 * await paste(userId, resourceId, date, createAllocationFn);
 * ```
 */
export function useAllocationClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardAllocation | null>(null);

  // Initialisieren aus localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLIPBOARD_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as ClipboardAllocation;

      // Nur wenn weniger als 1 Stunde alt
      const copiedAt = new Date(parsed.copiedAt);
      const expiryTime = new Date(Date.now() - CLIPBOARD_EXPIRY_MS);

      if (copiedAt > expiryTime) {
        setClipboard(parsed);
      } else {
        localStorage.removeItem(CLIPBOARD_KEY);
      }
    } catch {
      localStorage.removeItem(CLIPBOARD_KEY);
    }
  }, []);

  /**
   * Kopiert eine Allocation in die Zwischenablage.
   */
  const copy = useCallback((allocation: AllocationWithDetails) => {
    const data: ClipboardAllocation = {
      projectPhaseId: allocation.projectPhase.id,
      projectId: allocation.project.id,
      projectName: allocation.project.name,
      phaseName: allocation.projectPhase.name,
      plannedHours: allocation.plannedHours ?? 0,
      notes: allocation.notes,
      sourceDate: allocation.date.toISOString(),
      sourceUserId: allocation.user?.id,
      sourceResourceId: allocation.resource?.id,
      copiedAt: new Date().toISOString(),
    };

    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
    setClipboard(data);
    toast.success('Allocation kopiert', {
      description: `${data.projectName} - ${data.phaseName}`,
    });
  }, []);

  /**
   * Fügt die kopierte Allocation an einer neuen Position ein.
   */
  const paste = useCallback(
    async (
      targetUserId: string | undefined,
      targetResourceId: string | undefined,
      targetDate: string,
      createAllocation: (data: CreateAllocationInput) => Promise<{ success: boolean; error?: { message: string } }>
    ): Promise<boolean> => {
      if (!clipboard) {
        toast.error('Keine Allocation in der Zwischenablage');
        return false;
      }

      try {
        const result = await createAllocation({
          projectPhaseId: clipboard.projectPhaseId,
          userId: targetUserId,
          resourceId: targetResourceId,
          date: targetDate,
          notes: clipboard.notes,
        });

        if (result.success) {
          toast.success('Allocation eingefügt', {
            description: `${clipboard.projectName} - ${clipboard.phaseName}`,
          });
          return true;
        } else {
          toast.error('Fehler beim Einfügen', {
            description: result.error?.message,
          });
          return false;
        }
      } catch (error) {
        toast.error('Fehler beim Einfügen', {
          description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
        return false;
      }
    },
    [clipboard]
  );

  /**
   * Löscht die Zwischenablage.
   */
  const clear = useCallback(() => {
    localStorage.removeItem(CLIPBOARD_KEY);
    setClipboard(null);
  }, []);

  return {
    /** Aktuelle Clipboard-Daten */
    clipboard,
    /** Ob eine Allocation in der Zwischenablage ist */
    hasClipboard: clipboard !== null,
    /** Allocation kopieren */
    copy,
    /** Allocation einfügen */
    paste,
    /** Zwischenablage leeren */
    clear,
  };
}
