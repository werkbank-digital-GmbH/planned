/**
 * Reset Password Page
 *
 * Seite zum Anfordern eines Passwort-Reset-Links.
 *
 * @see FEATURES.md F1.4 für Akzeptanzkriterien
 */

import { ResetPasswordForm } from '@/presentation/components/auth';

export default function ResetPasswordPage() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-black">planned.</h1>
        <p className="text-gray mt-2">Passwort zurücksetzen</p>
      </div>

      {/* Reset Form */}
      <ResetPasswordForm />
    </div>
  );
}
