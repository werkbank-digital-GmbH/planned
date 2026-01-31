/**
 * Update Password Page
 *
 * Seite zum Setzen eines neuen Passworts nach Klick auf Reset-Link.
 *
 * @see FEATURES.md F1.5 für Akzeptanzkriterien
 */

import { UpdatePasswordForm } from '@/presentation/components/auth';

export default function UpdatePasswordPage() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-black">planned.</h1>
        <p className="text-gray mt-2">Neues Passwort eingeben</p>
      </div>

      {/* Update Form */}
      <UpdatePasswordForm />
    </div>
  );
}
