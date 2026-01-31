'use client';

import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logoutAction } from '@/presentation/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/presentation/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';

interface DesktopNavigationProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/planung', label: 'Planung' },
  { href: '/projekte', label: 'Projekte' },
  { href: '/einstellungen', label: 'Einstellungen' },
];

export function DesktopNavigation({ user }: DesktopNavigationProps) {
  const pathname = usePathname();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Navigation Links */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/dashboard" className="flex-shrink-0">
              <span className="text-xl font-bold text-black">
                planned<span className="text-accent">.</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:flex sm:space-x-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-gray-100 text-black'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="hidden sm:block text-sm text-gray-700">
                    {user.name}
                  </span>
                  <Avatar className="h-8 w-8">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="bg-accent text-white text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
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
      </div>
    </nav>
  );
}
