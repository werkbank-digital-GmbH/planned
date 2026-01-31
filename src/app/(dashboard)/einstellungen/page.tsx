import { redirect } from 'next/navigation';

/**
 * Einstellungen Index
 *
 * Leitet automatisch zur Profil-Seite weiter.
 */
export default function SettingsPage() {
  redirect('/einstellungen/profil');
}
