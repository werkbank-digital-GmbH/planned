import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Empty State Component
 *
 * Zeigt einen hilfreichen Leer-Zustand wenn keine Daten vorhanden sind.
 *
 * Features:
 * - Icon zur visuellen Unterscheidung
 * - Titel und Beschreibung
 * - Optionale Aktion (z.B. Button zum Erstellen)
 *
 * @example
 * <EmptyState
 *   icon={Calendar}
 *   title="Keine Allocations"
 *   description="Erstellen Sie Ihre erste Allocation per Drag & Drop"
 *   action={<Button>Allocation erstellen</Button>}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-1 text-lg font-medium">{title}</h3>
      {description && (
        <p className="mb-4 max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action}
    </div>
  );
}
