'use client';

import { useEffect, useState, useCallback } from 'react';

import type { UserRole } from '@/domain/types';

import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  deactivateUserAction,
  resendInvitationAction,
  type UserDTO,
} from '@/presentation/actions/users';
import {
  UserList,
  UserForm,
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

  // Load current user role
  useEffect(() => {
    // TODO: Get current user role from context/session
    // For now, assume admin for development
    setCurrentUserRole('admin');
    loadUsers();
  }, [loadUsers]);

  // Handlers
  const handleAddUser = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormError(undefined);
    setIsFormOpen(true);
  };

  const handleEditUser = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setFormMode('edit');
      setEditingUser(user);
      setFormError(undefined);
      setIsFormOpen(true);
    }
  };

  const handleDeactivateUser = async (id: string) => {
    if (!confirm('Möchten Sie diesen Mitarbeiter wirklich deaktivieren?')) {
      return;
    }

    try {
      const result = await deactivateUserAction(id);

      if (result.success) {
        await loadUsers();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('Fehler beim Deaktivieren');
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      const result = await resendInvitationAction(id);

      if (result.success) {
        alert('Einladung wurde erneut gesendet');
      } else {
        setError(result.error.message);
      }
    } catch {
      setError('Fehler beim Senden der Einladung');
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
        onDeactivateUser={handleDeactivateUser}
        onResendInvitation={handleResendInvitation}
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
        onSubmit={handleFormSubmit}
        onClose={handleFormClose}
      />
    </div>
  );
}
