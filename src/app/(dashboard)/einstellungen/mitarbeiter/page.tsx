'use client';

import { useCallback, useEffect, useState } from 'react';

import type { UserRole } from '@/domain/types';

import { getCurrentUserRoleAction } from '@/presentation/actions/shared/auth';
import {
  createUserAction,
  deactivateUserAction,
  getUsersAction,
  resendInvitationAction,
  updateUserAction,
  type UserDTO,
} from '@/presentation/actions/users';
import {
  UserForm,
  UserList,
  type User,
  type UserFormData,
} from '@/presentation/components/settings';

/**
 * Mitarbeiter-Verwaltung Seite
 *
 * Zeigt eine Liste aller Mitarbeiter und ermöglicht das
 * Erstellen, Bearbeiten und Deaktivieren von Mitarbeitern.
 *
 * @see FEATURES.md F6.1-F6.5
 */
export default function MitarbeiterPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('planer');

  // Form State
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getUsersAction(false);

      if (result.success) {
        setUsers(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('Fehler beim Laden der Mitarbeiter');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load current user role and users
  useEffect(() => {
    getCurrentUserRoleAction().then(setCurrentUserRole).catch(() => {
      setCurrentUserRole('gewerblich');
    });
    loadUsers();
  }, [loadUsers]);

  // Handlers
  const handleAddUser = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const handleEditUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setFormMode('edit');
      setEditingUser(user);
      setFormError(undefined);
      setIsFormOpen(true);
    }
  };

  const handleDeactivateUser = async () => {
    if (!editingUser) return;

    if (!confirm('Möchten Sie diesen Mitarbeiter wirklich deaktivieren?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deactivateUserAction(editingUser.id);

      if (result.success) {
        setIsFormOpen(false);
        setEditingUser(null);
        await loadUsers();
      } else {
        setFormError(result.error.message);
      }
    } catch {
      setFormError('Fehler beim Deaktivieren');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const result = await resendInvitationAction(editingUser.id);

      if (result.success) {
        alert('Einladung wurde erneut gesendet');
      } else {
        setFormError(result.error.message);
      }
    } catch {
      setFormError('Fehler beim Senden der Einladung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    setFormError(undefined);

    try {
      const formData = new FormData();
      formData.set('email', data.email);
      formData.set('fullName', data.fullName);
      formData.set('role', data.role);
      formData.set('weeklyHours', String(data.weeklyHours));

      if (formMode === 'edit' && editingUser) {
        formData.set('userId', editingUser.id);
        const result = await updateUserAction(formData);

        if (result.success) {
          setIsFormOpen(false);
          await loadUsers();
        } else {
          setFormError(result.error.message);
        }
      } else {
        const result = await createUserAction(formData);

        if (result.success) {
          setIsFormOpen(false);
          await loadUsers();
        } else {
          setFormError(result.error.message);
        }
      }
    } catch {
      setFormError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setFormError(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Lade Mitarbeiter...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Schließen
          </button>
        </div>
      )}

      {/* User List */}
      <UserList
        users={users}
        currentUserRole={currentUserRole}
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
      />

      {/* User Form Dialog */}
      <UserForm
        mode={formMode}
        initialData={
          editingUser
            ? {
                email: editingUser.email,
                fullName: editingUser.fullName,
                role: editingUser.role,
                weeklyHours: editingUser.weeklyHours,
              }
            : undefined
        }
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        error={formError}
        isActive={editingUser?.isActive ?? true}
        onSubmit={handleFormSubmit}
        onClose={handleFormClose}
        onDeactivate={handleDeactivateUser}
        onResendInvitation={handleResendInvitation}
      />
    </div>
  );
}
