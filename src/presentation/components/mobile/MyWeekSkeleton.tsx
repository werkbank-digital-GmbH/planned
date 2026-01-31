/**
 * Skeleton Loading State für Meine Woche
 *
 * Wird während des Ladens angezeigt.
 */
export function MyWeekSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
          <div className="text-center">
            <div className="mx-auto h-5 w-16 animate-pulse rounded bg-gray-200" />
            <div className="mx-auto mt-1 h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
        </div>
        <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-gray-200" />
      </header>

      {/* Days Skeleton */}
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {[...Array(5)].map((_, index) => (
          <DayCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function DayCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {/* Day Header */}
      <div className="border-b bg-gray-50 px-4 py-2">
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      {/* Allocation Skeleton */}
      <div className="divide-y">
        <div className="border-l-4 border-l-gray-200 px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="mt-1 h-3 w-20 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-4 w-8 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
