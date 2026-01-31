'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DayUtilizationDTO {
  date: string;
  dayName: string;
  capacity: number;
  planned: number;
  utilizationPercent: number;
}

interface UtilizationChartProps {
  data: DayUtilizationDTO[];
  calendarWeek: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Balkendiagramm für die Wochen-Auslastung.
 *
 * Features:
 * - Zeigt Kapazität vs. Geplante Stunden pro Tag
 * - Farbcodierung nach Auslastung: Grün (<80%), Gelb (80-100%), Rot (>100%)
 * - Responsive für verschiedene Bildschirmgrößen
 */
export function UtilizationChart({ data, calendarWeek }: UtilizationChartProps) {
  const getBarColor = (percent: number) => {
    if (percent > 100) return '#EF4444'; // Red
    if (percent >= 80) return '#F59E0B'; // Yellow/Orange
    return '#10B981'; // Green
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wochen-Auslastung (KW {calendarWeek})</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayName" />
            <YAxis unit="h" />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value}h`,
                name === 'capacity' ? 'Kapazität' : 'Geplant',
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="capacity" fill="#E5E7EB" name="capacity" radius={[4, 4, 0, 0]} />
            <Bar dataKey="planned" name="planned" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.utilizationPercent)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legende */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-300" />
            <span>Kapazität</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span>&lt;80%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-500" />
            <span>80-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span>&gt;100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
