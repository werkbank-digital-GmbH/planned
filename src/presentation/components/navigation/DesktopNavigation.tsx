'use client';

import { LogOut, Menu, User, Users, Truck, Link2, Building, LayoutDashboard, Calendar, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import type { UserRole } from '@/domain/types';

import { logoutAction } from '@/presentation/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/avatar';
import { Button } from '@/presentation/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/presentation/components/ui/dropdown-menu';
import { Separator } from '@/presentation/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/presentation/components/ui/sheet';

import { cn } from '@/lib/utils';

interface AppHeaderProps {
  user: { name: string; email: string; avatarUrl?: string | null };
  userRole: UserRole;
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/einstellungen')) return 'Einstellungen';
  if (pathname.startsWith('/projekte')) return 'Projekte';
  if (pathname.startsWith('/planung')) return 'Planung';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'planned.';
}

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/planung', label: 'Planung', icon: Calendar },
  { href: '/projekte', label: 'Projekte', icon: FolderOpen },
];

const settingsNavItems = [
  { href: '/einstellungen/profil', label: 'Profil', icon: User, adminOnly: false },
  { href: '/einstellungen/mitarbeiter', label: 'Mitarbeiter', icon: Users, adminOnly: true },
  { href: '/einstellungen/ressourcen', label: 'Ressourcen', icon: Truck, adminOnly: true },
  { href: '/einstellungen/integrationen', label: 'Integrationen', icon: Link2, adminOnly: true },
  { href: '/einstellungen/unternehmen', label: 'Unternehmen', icon: Building, adminOnly: true },
];

export function AppHeader({ user, userRole }: AppHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const visibleSettingsItems = settingsNavItems.filter(
    item => !item.adminOnly || userRole === 'admin'
  );

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Links: Hamburger + Seitentitel */}
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                {/* Navigation Section */}
                <div className="p-4 pt-10">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Navigation</p>
                  <nav className="flex flex-col gap-1">
                    {mainNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive ? 'bg-gray-100 text-black font-medium' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <Separator />

                {/* Einstellungen Section */}
                <div className="p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Einstellungen</p>
                  <nav className="flex flex-col gap-1">
                    {visibleSettingsItems.map(item => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive ? 'bg-gray-100 text-black font-medium' : 'text-gray-600 hover:text-black hover:bg-gray-50'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <Separator />

                {/* User + Logout */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-8 w-8">
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                      <AvatarFallback className="bg-accent text-white text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setOpen(false); logoutAction(); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    Abmelden
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </div>

          {/* Rechts: Avatar + Dropdown (kompakt) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="hidden sm:block text-sm text-gray-700">{user.name}</span>
                <Avatar className="h-8 w-8">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                  <AvatarFallback className="bg-accent text-white text-xs">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/einstellungen/profil" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutAction()}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
