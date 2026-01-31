'use client';

/**
 * Update Password Form Component
 *
 * Formular zum Setzen eines neuen Passworts nach Klick auf Reset-Link.
 *
 * @see FEATURES.md F1.5 für Akzeptanzkriterien
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { updatePasswordAction } from '@/presentation/actions/auth';
import { Button, Input, Label } from '@/presentation/components/ui';

export function UpdatePasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updatePasswordAction(formData);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccess(true);

      // Redirect nach 3 Sekunden
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-success-light text-success-dark rounded-md">
          Ihr Passwort wurde erfolgreich geändert!
        </div>
        <p className="text-sm text-gray">
          Sie werden in wenigen Sekunden zur Login-Seite weitergeleitet...
        </p>
        <Link
          href="/login"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Jetzt zum Login
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div
          className="p-3 bg-error-light text-error rounded-md text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-gray">
        Geben Sie Ihr neues Passwort ein. Das Passwort muss mindestens 8
        Zeichen lang sein.
      </p>

      {/* New Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mindestens 8 Zeichen"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Passwort wiederholen"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Wird gespeichert...' : 'Passwort speichern'}
      </Button>

      {/* Back to Login */}
      <div className="text-center">
        <Link
          href="/login"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Zurück zum Login
        </Link>
      </div>
    </form>
  );
}
