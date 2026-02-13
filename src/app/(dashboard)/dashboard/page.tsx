import { Suspense } from 'react';

import { getDashboardData } from '@/presentation/actions/dashboard';
import { getTenantInsightsAction } from '@/presentation/actions/insights';
import {
  AnalyticsKPIs,
  DashboardSkeleton,
  InsightsLastUpdated,
  RefreshInsightsButton,
  RiskProjectsList,
  TeamCapacityCard,
  TopProjectsCard,
  UpcomingAbsencesCard,
  UtilizationChart,
} from '@/presentation/components/dashboard';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  // Lade Dashboard-Daten und Insights parallel
  const [dashboardResult, insightsResult] = await Promise.all([
    getDashboardData(),
    getTenantInsightsAction(),
  ]);

  if (!dashboardResult.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Fehler beim Laden des Dashboards: {dashboardResult.error.message}
      </div>
    );
  }

  const data = dashboardResult.data!;
  const insights = insightsResult.success ? insightsResult.data : null;

  return (
    <div className="space-y-6">
      {/* Analytics KPIs (volle Breite) */}
      {insights ? (
        <div className="space-y-2">
          <AnalyticsKPIs data={insights} />
          <div className="flex items-center justify-end gap-4">
            <InsightsLastUpdated lastUpdatedAt={insights.lastUpdatedAt} />
            <RefreshInsightsButton lastRefreshAt={insights.lastUpdatedAt} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <span className="text-gray-500">
            Noch keine Auswertungen verfügbar. Die erste Analyse wird um 05:15 Uhr generiert.
          </span>
          <RefreshInsightsButton />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Wochen-Auslastung (volle Breite) */}
        <div className="lg:col-span-2">
          <UtilizationChart
            data={data.weeklyUtilization}
            calendarWeek={data.calendarWeek}
          />
        </div>

        {/* Team-Kapazität */}
        <TeamCapacityCard data={data.teamCapacity} />

        {/* Risiko-Projekte (aus Insights) */}
        {insights ? (
          <RiskProjectsList projects={insights.topRiskProjects} />
        ) : (
          /* Top Projekte als Fallback */
          <TopProjectsCard projects={data.topProjects} />
        )}

        {/* Bevorstehende Abwesenheiten */}
        <div className="lg:col-span-2">
          <UpcomingAbsencesCard absences={data.upcomingAbsences} />
        </div>
      </div>
    </div>
  );
}
