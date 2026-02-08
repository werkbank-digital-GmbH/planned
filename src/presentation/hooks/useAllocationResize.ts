'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface UseAllocationResizeOptions {
  /** IDs aller Allocations im Span */
  allocationIds: string[];
  /** Start-Tag-Index (0-4 für Mo-Fr) */
  startDayIndex: number;
  /** Aktuelle Span-Länge in Tagen */
  currentSpanDays: number;
  /** Phase-ID für neue Allocations */
  phaseId: string;
  /** User-ID wenn User-Allocation */
  userId?: string;
  /** Resource-ID wenn Resource-Allocation */
  resourceId?: string;
  /** Phase Start-Datum für Constraint */
  phaseStartDate?: string;
  /** Phase End-Datum für Constraint */
  phaseEndDate?: string;
  /** Wochentage (Mo-Fr) für Datumsberechnung */
  weekDates?: Date[];
  /** Callback wenn Resize abgeschlossen */
  onResizeComplete: (newSpanDays: number) => Promise<void>;
}

export interface UseAllocationResizeReturn {
  /** Props für das Resize-Handle Element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  /** Ob gerade ein Resize aktiv ist */
  isResizing: boolean;
  /** Preview der neuen Span-Länge während des Drags (für finale Position) */
  previewSpanDays: number;
  /** Pixel-Offset für Echtzeit-Animation während des Drags */
  pixelOffset: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für Echtzeit-Resize von Allocations.
 *
 * Ermöglicht das Verlängern/Verkürzen von Allocations durch Ziehen
 * des rechten Randes. Zeigt eine pixelgenaue Live-Preview während des Drags
 * und snappt beim Loslassen sanft zum nächsten vollen Tag.
 *
 * @example
 * ```tsx
 * const { handleProps, isResizing, previewSpanDays, pixelOffset } = useAllocationResize({
 *   allocationIds: ['alloc-1', 'alloc-2'],
 *   startDayIndex: 0,
 *   currentSpanDays: 2,
 *   phaseId: 'phase-123',
 *   userId: 'user-456',
 *   onResizeComplete: async (newSpanDays) => {
 *     // Erweitern oder verkleinern
 *   },
 * });
 * ```
 */
export function useAllocationResize({
  startDayIndex,
  currentSpanDays,
  phaseStartDate,
  phaseEndDate,
  weekDates,
  onResizeComplete,
}: UseAllocationResizeOptions): UseAllocationResizeReturn {
  const [isResizing, setIsResizing] = useState(false);
  const [previewSpanDays, setPreviewSpanDays] = useState(currentSpanDays);
  const [pixelOffset, setPixelOffset] = useState(0);

  // Refs für stabile Werte während des Drags
  const startXRef = useRef(0);
  const columnWidthRef = useRef(0);
  const currentSpanRef = useRef(currentSpanDays);
  const previewSpanRef = useRef(currentSpanDays);

  // Sync currentSpanDays mit ref
  useEffect(() => {
    currentSpanRef.current = currentSpanDays;
    if (!isResizing) {
      setPreviewSpanDays(currentSpanDays);
      previewSpanRef.current = currentSpanDays;
      setPixelOffset(0);
    }
  }, [currentSpanDays, isResizing]);

  /**
   * Berechnet die maximal erlaubte Span-Länge basierend auf Constraints.
   */
  const getMaxSpanDays = useCallback(() => {
    // Grundlegend: Maximal bis Freitag (5 Tage)
    let maxDays = 5 - startDayIndex;

    // Phase-End-Constraint prüfen
    if (phaseEndDate && weekDates && weekDates.length > 0) {
      const phaseEnd = new Date(phaseEndDate);
      for (let i = startDayIndex; i < weekDates.length; i++) {
        if (weekDates[i] > phaseEnd) {
          maxDays = Math.min(maxDays, i - startDayIndex);
          break;
        }
      }
    }

    return Math.max(1, maxDays);
  }, [startDayIndex, phaseEndDate, weekDates]);

  /**
   * Berechnet die minimal erlaubte Span-Länge basierend auf Constraints.
   */
  const getMinSpanDays = useCallback(() => {
    // Grundlegend: Mindestens 1 Tag
    let minDays = 1;

    // Phase-Start-Constraint prüfen (für Verkleinern relevant)
    if (phaseStartDate && weekDates && weekDates.length > 0) {
      const phaseStart = new Date(phaseStartDate);
      const startDate = weekDates[startDayIndex];
      if (startDate && startDate < phaseStart) {
        // Start liegt vor Phase-Start - nicht erlaubt, aber das sollte nicht passieren
        minDays = 1;
      }
    }

    return minDays;
  }, [startDayIndex, phaseStartDate, weekDates]);

  /**
   * Berechnet die Tagesänderung aus Pixel-Delta.
   * Verwendet Threshold-basierte Rundung für besseres Gefühl.
   */
  const calculateDaysDelta = useCallback((deltaX: number, colWidth: number): number => {
    if (colWidth <= 0) return 0;

    const rawDays = deltaX / colWidth;

    // Threshold-basierte Rundung: Snap ab 50% der Zelle
    // Funktioniert konsistent für positive und negative Werte
    if (rawDays >= 0) {
      return Math.floor(rawDays + 0.5);
    } else {
      return Math.ceil(rawDays - 0.5);
    }
  }, []);

  /**
   * Handler für Mouse-Down auf dem Resize-Handle.
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      setPixelOffset(0);
      startXRef.current = e.clientX;
      previewSpanRef.current = currentSpanRef.current;

      // Berechne Spaltenbreite aus dem Grid
      // Suche nach dem nächsten data-day-cell Element
      const cell = (e.currentTarget as HTMLElement).closest('[data-day-cell]');
      if (cell) {
        columnWidthRef.current = cell.getBoundingClientRect().width;
      } else {
        // Fallback: Schätze Spaltenbreite basierend auf Container
        const container = (e.currentTarget as HTMLElement).closest(
          '.grid-cols-5'
        );
        if (container) {
          columnWidthRef.current = container.getBoundingClientRect().width / 5;
        } else {
          columnWidthRef.current = 100; // Fallback
        }
      }

      const maxSpan = getMaxSpanDays();
      const minSpan = getMinSpanDays();
      const colWidth = columnWidthRef.current;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;

        // Pixelgenaues Tracking für smooth Animation
        // Begrenzt auf erlaubten Bereich
        const minDeltaX = (minSpan - currentSpanRef.current) * colWidth;
        const maxDeltaX = (maxSpan - currentSpanRef.current) * colWidth;
        const clampedDeltaX = Math.max(minDeltaX, Math.min(maxDeltaX, deltaX));

        setPixelOffset(clampedDeltaX);

        // Berechne vorbereitete Snap-Position für Preview
        const daysDelta = calculateDaysDelta(clampedDeltaX, colWidth);
        const newSpan = Math.max(
          minSpan,
          Math.min(maxSpan, currentSpanRef.current + daysDelta)
        );

        if (newSpan !== previewSpanRef.current) {
          previewSpanRef.current = newSpan;
          setPreviewSpanDays(newSpan);
        }
      };

      const handleMouseUp = async () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        const finalSpan = previewSpanRef.current;

        // Reset sofort — Grid-Column ändert sich direkt,
        // CSS transition-all duration-150 auf der Card animiert automatisch
        setIsResizing(false);
        setPixelOffset(0);

        if (finalSpan !== currentSpanRef.current) {
          try {
            await onResizeComplete(finalSpan);
          } catch (error) {
            setPreviewSpanDays(currentSpanRef.current);
            previewSpanRef.current = currentSpanRef.current;
            console.warn('[Resize] Resize failed:', error);
          }
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [getMaxSpanDays, getMinSpanDays, calculateDaysDelta, onResizeComplete]
  );

  /**
   * Handler für Touch-Start auf dem Resize-Handle.
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const touch = e.touches[0];
      if (!touch) return;

      setIsResizing(true);
      setPixelOffset(0);
      startXRef.current = touch.clientX;
      previewSpanRef.current = currentSpanRef.current;

      // Berechne Spaltenbreite
      const cell = (e.currentTarget as HTMLElement).closest('[data-day-cell]');
      if (cell) {
        columnWidthRef.current = cell.getBoundingClientRect().width;
      } else {
        const container = (e.currentTarget as HTMLElement).closest(
          '.grid-cols-5'
        );
        if (container) {
          columnWidthRef.current = container.getBoundingClientRect().width / 5;
        } else {
          columnWidthRef.current = 100;
        }
      }

      const maxSpan = getMaxSpanDays();
      const minSpan = getMinSpanDays();
      const colWidth = columnWidthRef.current;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        if (!moveTouch) return;

        const deltaX = moveTouch.clientX - startXRef.current;

        // Pixelgenaues Tracking für smooth Animation
        const minDeltaX = (minSpan - currentSpanRef.current) * colWidth;
        const maxDeltaX = (maxSpan - currentSpanRef.current) * colWidth;
        const clampedDeltaX = Math.max(minDeltaX, Math.min(maxDeltaX, deltaX));

        setPixelOffset(clampedDeltaX);

        // Berechne vorbereitete Snap-Position
        const daysDelta = calculateDaysDelta(clampedDeltaX, colWidth);
        const newSpan = Math.max(
          minSpan,
          Math.min(maxSpan, currentSpanRef.current + daysDelta)
        );

        if (newSpan !== previewSpanRef.current) {
          previewSpanRef.current = newSpan;
          setPreviewSpanDays(newSpan);
        }
      };

      const handleTouchEnd = async () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);

        const finalSpan = previewSpanRef.current;

        // Reset sofort — Grid-Column ändert sich direkt,
        // CSS transition-all duration-150 auf der Card animiert automatisch
        setIsResizing(false);
        setPixelOffset(0);

        if (finalSpan !== currentSpanRef.current) {
          try {
            await onResizeComplete(finalSpan);
          } catch (error) {
            setPreviewSpanDays(currentSpanRef.current);
            previewSpanRef.current = currentSpanRef.current;
            console.warn('[Resize] Resize failed:', error);
          }
        }
      };

      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    },
    [getMaxSpanDays, getMinSpanDays, calculateDaysDelta, onResizeComplete]
  );

  return {
    handleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
    isResizing,
    previewSpanDays,
    pixelOffset,
  };
}
