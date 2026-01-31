'use client';

import { Mail, UserX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { UserRole } from '@/domain/types';

import { Button } from '@/presentation/components/ui/button';

export interface UserFormData {
  email: string;
  fullName: string;
  role: UserRole;
  weeklyHours: number;
}

export interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<UserFormData>;
  isOpen: boolean;
  isSubmitting: boolean;
  error?: string;
  isActive?: boolean;
  onSubmit: (data: UserFormData) => void;
  onClose: () => void;
  onDeactivate?: () => void;
  onResendInvitation?: () => void;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'planer', label: 'Planer' },
  { value: 'gewerblich', label: 'Gewerblich' },
];

export function UserForm({
  mode,
  initialData,
  isOpen,
  isSubmitting,
  error,
  isActive = true,
  onSubmit,
  onClose,
  onDeactivate,
  onResendInvitation,
}: UserFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [formData, setFormData] = useState<UserFormData>({
    email: initialData?.email ?? '',
    fullName: initialData?.fullName ?? '',
    role: initialData?.role ?? 'gewerblich',
    weeklyHours: initialData?.weeklyHours ?? 40,
  });

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      email: initialData?.email ?? '',
      fullName: initialData?.fullName ?? '',
      role: initialData?.role ?? 'gewerblich',
      weeklyHours: initialData?.weeklyHours ?? 40,
    });
  }, [initialData]);

  // Handle dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const title = mode === 'create' ? 'Mitarbeiter hinzufügen' : 'Mitarbeiter bearbeiten';

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-lg p-0 backdrop:bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vorname + Nachname */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Max Mustermann"
            />
          </div>

          {/* E-Mail */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              disabled={mode === 'edit'}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="max@firma.de"
            />
            {mode === 'edit' && (
              <p className="mt-1 text-xs text-gray-500">
                E-Mail-Adresse kann nicht geändert werden
              </p>
            )}
          </div>

          {/* Rolle */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rolle
            </label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value as UserRole })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Wochenstunden */}
          <div>
            <label htmlFor="weeklyHours" className="block text-sm font-medium text-gray-700">
              Wochenstunden
            </label>
            <input
              type="number"
              id="weeklyHours"
              name="weeklyHours"
              required
              min={0}
              max={60}
              value={formData.weeklyHours}
              onChange={(e) =>
                setFormData({ ...formData, weeklyHours: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </form>

        {/* Additional Actions (nur im Edit-Mode für aktive User) */}
        {mode === 'edit' && isActive && (onResendInvitation || onDeactivate) && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="space-y-3">
              {onResendInvitation && (
                <button
                  type="button"
                  onClick={onResendInvitation}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  Einladung erneut senden
                </button>
              )}
              {onDeactivate && (
                <button
                  type="button"
                  onClick={onDeactivate}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" />
                  Mitarbeiter deaktivieren
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
