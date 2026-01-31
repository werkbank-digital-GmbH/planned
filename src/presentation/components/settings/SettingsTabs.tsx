'use client';

import { Building, Link2, Truck, User, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { UserRole } from '@/domain/types';

import { cn } from '@/lib/utils';

interface SettingsTabsProps {
  userRole: UserRole;
}

interface TabItem {
  href: string;
  label: string;
  icon: typeof Users;
}

const ADMIN_ITEMS: TabItem[] = [
  { href: '/einstellungen/mitarbeiter', label: 'Mitarbeiter', icon: Users },
  { href: '/einstellungen/ressourcen', label: 'Ressourcen', icon: Truck },
  { href: '/einstellungen/integrationen', label: 'Integrationen', icon: Link2 },
  { href: '/einstellungen/unternehmen', label: 'Unternehmen', icon: Building },
];

/**
 * Settings Tabs
 *
 * Horizontale Tab-Navigation für Einstellungen.
 * Zeigt verschiedene Tabs je nach Rolle:
 * - Admin: Alle Bereiche
 * - Planer/Gewerblich: Nur Profil
 */
export function SettingsTabs({ userRole }: SettingsTabsProps) {
  const pathname = usePathname();

  const adminItems = userRole === 'admin' ? ADMIN_ITEMS : [];

  const allItems: TabItem[] = [
    { href: '/einstellungen/profil', label: 'Profil', icon: User },
    ...adminItems,
  ];

  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto">
          {allItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/einstellungen/profil' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
