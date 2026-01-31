import { Suspense } from 'react';

import { getDashboardData } from '@/presentation/actions/dashboard';
import { DashboardSkeleton } from '@/presentation/components/dashboard/DashboardSkeleton';
import { TeamCapacityCard } from '@/presentation/components/dashboard/TeamCapacityCard';
import { TopProjectsCard } from '@/presentation/components/dashboard/TopProjectsCard';
import { UpcomingAbsencesCard } from '@/presentation/components/dashboard/UpcomingAbsencesCard';
import { UtilizationChart } from '@/presentation/components/dashboard/UtilizationChart';

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const result = await getDashboardData();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Fehler beim Laden des Dashboards: {result.error.message}
      </div>
    );
  }

  const data = result.data!;

  return (
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

      {/* Top Projekte */}
      <TopProjectsCard projects={data.topProjects} />

      {/* Bevorstehende Abwesenheiten */}
      <div className="lg:col-span-2">
        <UpcomingAbsencesCard absences={data.upcomingAbsences} />
      </div>
    </div>
  );
}
