'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface RefreshState {
  lastRefreshAt: Date | null;
  canRefresh: boolean;
  nextRefreshAt: Date | null;
  waitMinutes: number | null;
}

interface UseRefreshInsightsReturn {
  /** Löst einen Refresh aus */
  refresh: () => Promise<void>;
  /** Ob gerade ein Refresh läuft */
  isRefreshing: boolean;
  /** Zeitpunkt des letzten Refreshs */
  lastRefreshAt: Date | null;
  /** Zeitpunkt ab dem der nächste Refresh erlaubt ist */
  nextRefreshAt: Date | null;
  /** Ob ein Refresh aktuell erlaubt ist */
  canRefresh: boolean;
  /** Minuten bis zum nächsten erlaubten Refresh */
  waitMinutes: number | null;
}

interface RefreshStatusResponse {
  lastRefreshAt: string | null;
  canRefresh: boolean;
  nextRefreshAt: string | null;
  waitMinutes: number | null;
}

interface RefreshSuccessResponse {
  success: true;
  lastRefreshAt: string;
}

interface RefreshRateLimitedResponse {
  success: false;
  error: 'rate_limited';
  nextRefreshAt: string;
  waitMinutes: number;
}

interface RefreshErrorResponse {
  success: false;
  error: string;
  message?: string;
}

type RefreshResponse =
  | RefreshSuccessResponse
  | RefreshRateLimitedResponse
  | RefreshErrorResponse;

// Rate Limit: 1 Stunde in Millisekunden (für Client-Side Berechnung)
const RATE_LIMIT_MS = 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook für das manuelle Aktualisieren von Insights.
 *
 * Features:
 * - Rate Limiting (max 1x pro Stunde)
 * - Optimistic UI (Client-side Berechnung ob Refresh erlaubt)
 * - Toast-Benachrichtigungen
 * - Auto-Reload nach erfolgreichem Refresh
 *
 * @param initialLastRefreshAt - Optionaler initialer Timestamp vom Server
 * @param onRefreshSuccess - Callback nach erfolgreichem Refresh (z.B. für Daten-Reload)
 */
export function useRefreshInsights(
  initialLastRefreshAt?: string | null,
  onRefreshSuccess?: () => void
): UseRefreshInsightsReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [state, setState] = useState<RefreshState>(() => {
    const lastRefresh = initialLastRefreshAt ? new Date(initialLastRefreshAt) : null;
    return calculateRefreshState(lastRefresh);
  });

  // Initial Status laden
  useEffect(() => {
    loadRefreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodisches Update der canRefresh-Berechnung (jede Minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => calculateRefreshState(prev.lastRefreshAt));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Lädt den aktuellen Refresh-Status vom Server.
   */
  const loadRefreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/insights/refresh');
      if (response.ok) {
        const data: RefreshStatusResponse = await response.json();
        const lastRefresh = data.lastRefreshAt ? new Date(data.lastRefreshAt) : null;
        setState(calculateRefreshState(lastRefresh));
      }
    } catch {
      // Fehler ignorieren, wir nutzen den initialLastRefreshAt
    }
  }, []);

  /**
   * Führt den Refresh durch.
   */
  const refresh = useCallback(async () => {
    if (!state.canRefresh || isRefreshing) return;

    setIsRefreshing(true);

    try {
      const response = await fetch('/api/insights/refresh', {
        method: 'POST',
      });

      const data: RefreshResponse = await response.json();

      if (data.success) {
        const newLastRefresh = new Date(data.lastRefreshAt);
        setState(calculateRefreshState(newLastRefresh));
        toast.success('Insights wurden aktualisiert');

        // Callback für Daten-Reload
        if (onRefreshSuccess) {
          onRefreshSuccess();
        } else {
          // Fallback: Seite neu laden um frische Daten zu zeigen
          window.location.reload();
        }
      } else if (data.error === 'rate_limited') {
        const rateLimited = data as RefreshRateLimitedResponse;
        setState({
          lastRefreshAt: state.lastRefreshAt,
          canRefresh: false,
          nextRefreshAt: new Date(rateLimited.nextRefreshAt),
          waitMinutes: rateLimited.waitMinutes,
        });
        toast.error(`Bitte warte noch ${rateLimited.waitMinutes} Minuten`);
      } else {
        const errorResponse = data as RefreshErrorResponse;
        toast.error(errorResponse.message || 'Aktualisierung fehlgeschlagen');
      }
    } catch {
      toast.error('Netzwerkfehler - bitte erneut versuchen');
    } finally {
      setIsRefreshing(false);
    }
  }, [state.canRefresh, state.lastRefreshAt, isRefreshing, onRefreshSuccess]);

  return {
    refresh,
    isRefreshing,
    lastRefreshAt: state.lastRefreshAt,
    nextRefreshAt: state.nextRefreshAt,
    canRefresh: state.canRefresh,
    waitMinutes: state.waitMinutes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Berechnet den Refresh-State basierend auf dem letzten Refresh-Timestamp.
 */
function calculateRefreshState(lastRefreshAt: Date | null): RefreshState {
  if (!lastRefreshAt) {
    return {
      lastRefreshAt: null,
      canRefresh: true,
      nextRefreshAt: null,
      waitMinutes: null,
    };
  }

  const timeSinceLastRefresh = Date.now() - lastRefreshAt.getTime();
  const canRefresh = timeSinceLastRefresh >= RATE_LIMIT_MS;

  if (canRefresh) {
    return {
      lastRefreshAt,
      canRefresh: true,
      nextRefreshAt: null,
      waitMinutes: null,
    };
  }

  const nextRefreshAt = new Date(lastRefreshAt.getTime() + RATE_LIMIT_MS);
  const waitMinutes = Math.ceil((RATE_LIMIT_MS - timeSinceLastRefresh) / (60 * 1000));

  return {
    lastRefreshAt,
    canRefresh: false,
    nextRefreshAt,
    waitMinutes,
  };
}
