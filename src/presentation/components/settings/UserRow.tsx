'use client';

import { MoreHorizontal, Mail, UserX } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import type { UserRole } from '@/domain/types';

import { Button } from '@/presentation/components/ui/button';

export interface UserRowProps {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive: boolean;
  avatarUrl?: string;
  isAdmin: boolean;
  onEdit: (id: string) => void;
  onDeactivate: (id: string) => void;
  onResendInvitation: (id: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  planer: 'Planer',
  gewerblich: 'Gewerblich',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  planer: 'bg-blue-100 text-blue-800',
  gewerblich: 'bg-gray-100 text-gray-800',
};

export function UserRow({
  id,
  email,
  fullName,
  role,
  weeklyHours,
  isActive,
  avatarUrl,
  isAdmin,
  onEdit,
  onDeactivate,
  onResendInvitation,
}: UserRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <tr
      className={`border-b border-gray-100 hover:bg-gray-50 ${!isActive ? 'opacity-60' : ''}`}
      data-testid="user-row"
    >
      {/* Avatar & Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-accent">
              {initials}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{fullName}</div>
            <div className="text-sm text-gray-500">{email}</div>
          </div>
        </div>
      </td>

      {/* Rolle */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}
        >
          {ROLE_LABELS[role]}
        </span>
      </td>

      {/* Wochenstunden */}
      <td className="px-4 py-3 text-gray-600">{weeklyHours} Std.</td>

      {/* Status */}
      <td className="px-4 py-3">
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-sm text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Aktiv
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-gray-500">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Inaktiv
          </span>
        )}
      </td>

      {/* Aktionen */}
      <td className="px-4 py-3">
        {isAdmin && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Aktionen"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {isMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      onEdit(id);
                      setIsMenuOpen(false);
                    }}
                  >
                    Bearbeiten
                  </button>

                  {isActive && (
                    <>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          onResendInvitation(id);
                          setIsMenuOpen(false);
                        }}
                      >
                        <Mail className="h-4 w-4" />
                        Einladung erneut senden
                      </button>

                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        onClick={() => {
                          onDeactivate(id);
                          setIsMenuOpen(false);
                        }}
                      >
                        <UserX className="h-4 w-4" />
                        Deaktivieren
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
