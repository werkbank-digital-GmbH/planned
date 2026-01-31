'use client';

import { User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getUsersAction, type UserDTO } from '@/presentation/actions/users';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface UserResourceSelectorProps {
  /** Ausgewählte User-ID */
  userId?: string;
  /** Ausgewählte Resource-ID */
  resourceId?: string;
  /** Callback wenn ein User ausgewählt wird */
  onUserSelect: (userId: string | undefined) => void;
  /** Callback wenn eine Resource ausgewählt wird */
  onResourceSelect: (resourceId: string | undefined) => void;
  /** Fehlermeldung */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auswahl von Mitarbeiter oder Resource.
 *
 * Lädt automatisch alle aktiven Mitarbeiter.
 * (Ressourcen werden in zukünftiger Version hinzugefügt)
 */
export function UserResourceSelector({
  userId,
  resourceId: _resourceId,
  onUserSelect,
  onResourceSelect: _onResourceSelect,
  error,
}: UserResourceSelectorProps) {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lade Mitarbeiter beim Mount
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const result = await getUsersAction(true); // Nur aktive
        if (result.success) {
          setUsers(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">Lade Mitarbeiter...</div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Mitarbeiter-Liste */}
      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onUserSelect(user.id)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
              'border-input bg-background hover:bg-accent',
              userId === user.id && 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
            )}
          >
            <User className="h-3 w-3" />
            <span>{user.fullName}</span>
          </button>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Keine aktiven Mitarbeiter gefunden
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
