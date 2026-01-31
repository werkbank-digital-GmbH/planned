import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LoadingStateProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Loading State Component
 *
 * Zeigt einen Loading-Indikator während Daten geladen werden.
 *
 * @example
 * <LoadingState />
 * <LoadingState text="Allocations werden geladen..." size="lg" />
 */
export function LoadingState({
  text = 'Laden...',
  className,
  size = 'md',
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 p-4', className)}>
      <Loader2 className={cn('animate-spin text-accent', SIZE_CLASSES[size])} />
      <span className="text-gray-500">{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Planning Grid Skeleton
 *
 * Skeleton-Platzhalter für die Planungsansicht während des Ladens.
 */
export function PlanningGridSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-6 gap-2 border-b p-4">
        <div className="h-10 rounded bg-gray-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded bg-gray-200" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-2 border-b p-4">
          <div className="h-16 rounded bg-gray-200" />
          {[...Array(5)].map((_, j) => (
            <div key={j} className="h-16 rounded bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 *
 * Skeleton-Platzhalter für Tabellen-Ansichten.
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 border-b p-4">
        <div className="h-4 w-1/4 rounded bg-gray-200" />
        <div className="h-4 w-1/4 rounded bg-gray-200" />
        <div className="h-4 w-1/4 rounded bg-gray-200" />
        <div className="h-4 w-1/4 rounded bg-gray-200" />
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 border-b p-4">
          <div className="h-4 w-1/4 rounded bg-gray-100" />
          <div className="h-4 w-1/4 rounded bg-gray-100" />
          <div className="h-4 w-1/4 rounded bg-gray-100" />
          <div className="h-4 w-1/4 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

/**
 * Card Skeleton
 *
 * Skeleton-Platzhalter für Karten-Komponenten.
 */
export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-white p-4">
      <div className="mb-4 h-4 w-2/3 rounded bg-gray-200" />
      <div className="mb-2 h-3 w-full rounded bg-gray-100" />
      <div className="h-3 w-3/4 rounded bg-gray-100" />
    </div>
  );
}
