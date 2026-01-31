import { Card, CardContent, CardHeader } from '@/presentation/components/ui/card';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Skeleton-Loading-State für das Dashboard.
 */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Wochen-Auslastung (volle Breite) */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] animate-pulse rounded bg-gray-100" />
          </CardContent>
        </Card>
      </div>

      {/* Team-Kapazität */}
      <Card>
        <CardHeader>
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="mb-1 h-8 w-16 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="h-2 animate-pulse rounded-full bg-gray-200" />
        </CardContent>
      </Card>

      {/* Top Projekte */}
      <Card>
        <CardHeader>
          <div className="h-6 w-44 animate-pulse rounded bg-gray-200" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-12 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-1.5 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bevorstehende Abwesenheiten */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="h-6 w-56 animate-pulse rounded bg-gray-200" />
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                  </div>
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
