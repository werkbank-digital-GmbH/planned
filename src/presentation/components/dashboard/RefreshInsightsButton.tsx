'use client';

import { Clock, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/presentation/components/ui/button';
import { useRefreshInsights } from '@/presentation/hooks/useRefreshInsights';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface RefreshInsightsButtonProps {
  /** Initialer Timestamp des letzten Refreshs (vom Server) */
  lastRefreshAt?: string | null;
  /** Callback nach erfolgreichem Refresh */
  onRefreshSuccess?: () => void;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Button zum manuellen Aktualisieren der Insights.
 *
 * Features:
 * - Zeigt unterschiedliche States (bereit, läuft, warten)
 * - Rate Limited auf 1x pro Stunde
 * - Zeigt verbleibende Wartezeit an
 *
 * @example
 * ```tsx
 * <RefreshInsightsButton
 *   lastRefreshAt={insights.lastUpdatedAt}
 *   onRefreshSuccess={() => router.refresh()}
 * />
 * ```
 */
export function RefreshInsightsButton({
  lastRefreshAt: initialLastRefresh,
  onRefreshSuccess,
  className,
}: RefreshInsightsButtonProps) {
  const { refresh, isRefreshing, canRefresh, waitMinutes } = useRefreshInsights(
    initialLastRefresh,
    onRefreshSuccess
  );

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={refresh}
      disabled={!canRefresh || isRefreshing}
      className={cn('gap-2', className)}
    >
      {isRefreshing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Aktualisiere...</span>
        </>
      ) : canRefresh ? (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Aktualisieren</span>
        </>
      ) : (
        <>
          <Clock className="h-4 w-4" />
          <span>Noch {waitMinutes} Min</span>
        </>
      )}
    </Button>
  );
}
