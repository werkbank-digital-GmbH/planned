'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Key } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { changePasswordAction } from '@/presentation/actions/auth';
import { Button } from '@/presentation/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/ui/dialog';
import { Input } from '@/presentation/components/ui/input';
import { Label } from '@/presentation/components/ui/label';

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Aktuelles Passwort erforderlich'),
    newPassword: z.string().min(8, 'Mindestens 8 Zeichen'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Passwort-Ändern Bereich
 *
 * Features:
 * - Dialog für Passwortänderung
 * - Aktuelles Passwort erforderlich
 * - Passwort-Bestätigung
 * - Validierung und Feedback
 */
export function PasswordChangeSection() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    const formData = new FormData();
    formData.set('currentPassword', data.currentPassword);
    formData.set('newPassword', data.newPassword);

    const result = await changePasswordAction(formData);

    if (result.success) {
      toast.success('Passwort geändert');
      setIsOpen(false);
      reset();
    } else {
      toast.error(result.error.message);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Sicherheit</h2>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Key className="mr-2 h-4 w-4" />
            Passwort ändern
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input
                id="currentPassword"
                type="password"
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className="text-sm text-red-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Wird geändert...' : 'Passwort ändern'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
