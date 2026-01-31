'use client';

/**
 * Reset Password Form Component
 *
 * Formular zum Anfordern eines Passwort-Reset-Links.
 *
 * @see FEATURES.md F1.4 für Akzeptanzkriterien
 */

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { resetPasswordAction } from '@/presentation/actions/auth';
import { Button, Input, Label } from '@/presentation/components/ui';

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await resetPasswordAction(formData);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="p-4 bg-success-light text-success-dark rounded-md">
          Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum
          Zurücksetzen des Passworts gesendet.
        </div>
        <p className="text-sm text-gray">
          Bitte überprüfen Sie auch Ihren Spam-Ordner.
        </p>
        <Link
          href="/login"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Zurück zum Login
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
        Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen einen Link zum
        Zurücksetzen Ihres Passworts.
      </p>

      {/* E-Mail Field */}
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ihre@email.de"
          autoComplete="email"
          required
          disabled={isPending}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Wird gesendet...' : 'Link anfordern'}
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
