'use client';

/**
 * Login Form Component
 *
 * Formular für E-Mail/Passwort-Login mit:
 * - Validierung
 * - "Angemeldet bleiben" Checkbox
 * - "Passwort vergessen" Link
 * - Loading State
 * - Error Handling
 *
 * @see FEATURES.md F1.1 für Akzeptanzkriterien
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { loginAction } from '@/presentation/actions/auth';
import { Button, Input, Label, Checkbox } from '@/presentation/components/ui';

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Redirect zu ursprünglicher URL oder rollen-basiertem Default
      const targetUrl = redirectTo || result.data.redirectTo;
      router.push(targetUrl);
      router.refresh();
    });
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

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mindestens 8 Zeichen"
          autoComplete="current-password"
          required
          minLength={8}
          disabled={isPending}
        />
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" name="rememberMe" disabled={isPending} />
          <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
            Angemeldet bleiben
          </Label>
        </div>
        <Link
          href="/reset-password"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          Passwort vergessen?
        </Link>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Wird angemeldet...' : 'Anmelden'}
      </Button>
    </form>
  );
}
