import { Suspense } from 'react';

import { getMyWeek } from '@/presentation/actions/my-week';
import { MyWeekSkeleton, MyWeekView } from '@/presentation/components/mobile';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Meine Woche Page
 *
 * Mobile Ansicht für gewerbliche Mitarbeiter.
 * Zeigt die eigenen Allocations und Abwesenheiten.
 */
export default async function MyWeekPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const weekStart = params.week;

  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<MyWeekSkeleton />}>
        <MyWeekContent weekStart={weekStart} />
      </Suspense>
    </div>
  );
}

async function MyWeekContent({ weekStart }: { weekStart?: string }) {
  const result = await getMyWeek(weekStart);

  if (!result.success) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p>Fehler beim Laden</p>
          <p className="mt-1 text-sm">{result.error.message}</p>
        </div>
      </div>
    );
  }

  return <MyWeekView data={result.data} />;
}
