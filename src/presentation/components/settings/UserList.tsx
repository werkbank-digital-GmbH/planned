'use client';

import { Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { UserRole } from '@/domain/types';

import { Button } from '@/presentation/components/ui/button';

import { UserRow } from './UserRow';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
  isActive: boolean;
  avatarUrl?: string;
}

export interface UserListProps {
  users: User[];
  currentUserRole: UserRole;
  onAddUser: () => void;
  onEditUser: (id: string) => void;
}

export function UserList({
  users,
  currentUserRole,
  onAddUser,
  onEditUser,
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const isAdmin = currentUserRole === 'admin';

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter by active status
    if (!showInactive) {
      filtered = filtered.filter((user) => user.isActive);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [users, searchQuery, showInactive]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mitarbeiter</h1>
          <p className="text-sm text-gray-500">
            {users.filter((u) => u.isActive).length} aktive Mitarbeiter
          </p>
        </div>

        {isAdmin && (
          <Button onClick={onAddUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Mitarbeiter hinzufügen
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Nach Name oder E-Mail suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Show Inactive Toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
          Inaktive anzeigen
        </label>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Mitarbeiter
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Rolle
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Wochenstunden
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                {/* Actions */}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  {searchQuery
                    ? 'Keine Mitarbeiter gefunden'
                    : 'Noch keine Mitarbeiter vorhanden'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  {...user}
                  isAdmin={isAdmin}
                  onEdit={onEditUser}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
