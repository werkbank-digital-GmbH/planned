'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SlideTransitionProps {
  /** Ändert sich bei jedem Periodenwechsel (z.B. weekStart.toISOString()) */
  transitionKey: string;
  /** Richtung der Enter-Animation */
  direction: 'left' | 'right' | null;
  /** Callback wenn die Animation abgeschlossen ist */
  onTransitionEnd?: () => void;
  children: ReactNode;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrapper-Komponente für CSS enter-Animation beim Periodenwechsel.
 *
 * Bei einem Wechsel (neuer transitionKey):
 * 1. Neuer Content startet versetzt (translateX ±30px, opacity 0)
 * 2. Animiert zu translateX(0), opacity 1 (200ms ease-out)
 *
 * Wenn direction === null → kein Slide (z.B. bei initialem Render).
 */
export function SlideTransition({
  transitionKey,
  direction,
  onTransitionEnd,
  children,
}: SlideTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevKeyRef = useRef(transitionKey);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Nur animieren wenn sich der Key geändert hat UND eine Richtung gesetzt ist
    if (prevKeyRef.current !== transitionKey && direction !== null) {
      prevKeyRef.current = transitionKey;
      setIsAnimating(true);

      // Animation nach Abschluss aufräumen
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onTransitionEnd?.();
      }, 200); // Muss zur CSS-Duration passen

      return () => {
        clearTimeout(timer);
      };
    }

    // Key hat sich geändert, aber keine Richtung → einfach updaten
    prevKeyRef.current = transitionKey;

    return undefined;
  }, [transitionKey, direction, onTransitionEnd]);

  return (
    <div
      ref={containerRef}
      className={cn(
        // Basis: kein overflow-clip, damit Scroll erhalten bleibt
        'w-full h-full',
        // Animation-Klassen nur während des Slide
        isAnimating && direction === 'right' && 'animate-slide-in-right',
        isAnimating && direction === 'left' && 'animate-slide-in-left'
      )}
    >
      {children}
    </div>
  );
}
