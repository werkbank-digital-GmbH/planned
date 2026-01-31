'use client';

import { Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface NavItem {
  href: string;
  label: string;
  icon: typeof Calendar;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const NAV_ITEMS: NavItem[] = [
  { href: '/meine-woche', label: 'Woche', icon: Calendar },
  { href: '/profil', label: 'Profil', icon: User },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mobile Bottom Navigation
 *
 * Features:
 * - Aktiver Tab hervorgehoben
 * - Safe Area für iPhone Notch/Home Indicator
 * - Touch-freundliche Größe
 */
export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white pb-safe">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center px-4 py-2',
                isActive ? 'text-accent' : 'text-gray-400'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="mt-1 text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
