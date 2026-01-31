import { CalendarOff } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AbsenceSummaryDTO {
  id: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface UpcomingAbsencesCardProps {
  absences: AbsenceSummaryDTO[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const ABSENCE_TYPE_LABELS: Record<string, string> = {
  urlaub: 'Urlaub',
  krank: 'Krank',
  feiertag: 'Feiertag',
  fortbildung: 'Fortbildung',
  sonstiges: 'Sonstiges',
};

const ABSENCE_TYPE_COLORS: Record<string, string> = {
  urlaub: 'bg-blue-100 text-blue-700',
  krank: 'bg-red-100 text-red-700',
  feiertag: 'bg-purple-100 text-purple-700',
  fortbildung: 'bg-green-100 text-green-700',
  sonstiges: 'bg-gray-100 text-gray-700',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === end) {
    return start;
  }
  return `${start} - ${end}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Zeigt bevorstehende Abwesenheiten.
 *
 * Features:
 * - Sortiert nach Datum
 * - Farbcodierung nach Typ
 * - Username und Zeitraum
 */
export function UpcomingAbsencesCard({ absences }: UpcomingAbsencesCardProps) {
  if (absences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Bevorstehende Abwesenheiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-sm text-gray-500">
            Keine Abwesenheiten diese Woche.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          Bevorstehende Abwesenheiten
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {absences.map((absence) => (
            <div
              key={absence.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ABSENCE_TYPE_COLORS[absence.type] || ABSENCE_TYPE_COLORS.sonstiges
                  }`}
                >
                  {ABSENCE_TYPE_LABELS[absence.type] || absence.type}
                </span>
                <span className="font-medium">{absence.userName}</span>
              </div>
              <span className="text-sm text-gray-500">
                {formatDateRange(absence.startDate, absence.endDate)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
