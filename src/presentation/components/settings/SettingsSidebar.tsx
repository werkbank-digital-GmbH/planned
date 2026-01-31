'use client';

import { Building, Link2, Truck, User, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { UserRole } from '@/domain/types';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface SettingsSidebarProps {
  userRole: UserRole;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_ITEMS: NavItem[] = [
  { href: '/einstellungen/mitarbeiter', label: 'Mitarbeiter', icon: Users },
  { href: '/einstellungen/ressourcen', label: 'Ressourcen', icon: Truck },
  { href: '/einstellungen/integrationen', label: 'Integrationen', icon: Link2 },
  { href: '/einstellungen/unternehmen', label: 'Unternehmen', icon: Building },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Settings Sidebar
 *
 * Navigation für Einstellungen. Zeigt verschiedene Bereiche je nach Rolle:
 * - Admin: Alle Bereiche
 * - Planer/Gewerblich: Nur Profil
 */
export function SettingsSidebar({ userRole }: SettingsSidebarProps) {
  const pathname = usePathname();

  const items = userRole === 'admin' ? ADMIN_ITEMS : [];

  return (
    <aside className="w-64 border-r bg-gray-50">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Einstellungen</h2>
      </div>

      <nav className="space-y-1 px-2">
        {/* Profil für alle */}
        <SidebarItem
          href="/einstellungen/profil"
          label="Mein Profil"
          icon={User}
          isActive={pathname === '/einstellungen/profil'}
        />

        {/* Admin Items */}
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-accent text-white' : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
