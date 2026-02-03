import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface InsightsLastUpdatedProps {
  lastUpdatedAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHTS LAST UPDATED COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt den Zeitstempel der letzten Insight-Aktualisierung an.
 *
 * Formatierung: "Stand von: 03.02.2026, 06:15 Uhr"
 */
export function InsightsLastUpdated({ lastUpdatedAt }: InsightsLastUpdatedProps) {
  if (!lastUpdatedAt) {
    return null;
  }

  const date = parseISO(lastUpdatedAt);
  const formattedDate = format(date, "dd.MM.yyyy, HH:mm 'Uhr'", { locale: de });

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Clock className="h-3 w-3" />
      <span>Stand von: {formattedDate}</span>
    </div>
  );
}
