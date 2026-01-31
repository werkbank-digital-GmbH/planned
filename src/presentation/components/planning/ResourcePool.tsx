'use client';

import { Truck, Users } from 'lucide-react';
import { useState } from 'react';

import type { PoolItem } from '@/application/queries';

import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/components/ui/card';

import { cn } from '@/lib/utils';

import { PoolCard } from './PoolCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ResourcePoolProps {
  poolItems: PoolItem[];
  weekDates: Date[];
}

type FilterTab = 'all' | 'users' | 'resources';

const FILTER_TABS: { value: FilterTab; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Alle', icon: null },
  { value: 'users', label: 'Mitarbeiter', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'resources', label: 'Fuhrpark', icon: <Truck className="h-3.5 w-3.5" /> },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ressourcen-Pool am unteren Bildschirmrand.
 *
 * Zeigt alle Mitarbeiter und Ressourcen mit deren Verfügbarkeit.
 * Items können per Drag & Drop auf Phasen-Zellen gezogen werden.
 *
 * Features:
 * - Filter-Tabs: Alle / Mitarbeiter / Fuhrpark
 * - Verfügbarkeits-Indikatoren pro Tag
 * - Abwesenheits-Label (z.B. "Urlaub Di-Mi")
 */
export function ResourcePool({ poolItems, weekDates }: ResourcePoolProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter anwenden
  const filteredItems = poolItems.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'users') return item.type === 'user';
    if (activeTab === 'resources') return item.type === 'resource';
    return true;
  });

  // Zähler
  const userCount = poolItems.filter((p) => p.type === 'user').length;
  const resourceCount = poolItems.filter((p) => p.type === 'resource').length;
  const availableCount = poolItems.filter(
    (p) => p.availability.some((a) => a.status === 'available')
  ).length;

  return (
    <Card className="mt-4 bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Ressourcen-Pool
            <Badge variant="secondary" className="text-xs">
              {availableCount} verfügbar
            </Badge>
          </CardTitle>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-lg border">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? poolItems.length
                  : tab.value === 'users'
                    ? userCount
                    : resourceCount;

              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                    activeTab === tab.value
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    className={cn(
                      'ml-1',
                      activeTab === tab.value ? 'text-gray-500' : 'text-gray-400'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredItems.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {filteredItems.map((item) => (
              <PoolCard key={`${item.type}-${item.id}`} item={item} weekDates={weekDates} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 text-sm">
            Keine Ressourcen in dieser Kategorie
          </div>
        )}
      </CardContent>
    </Card>
  );
}
