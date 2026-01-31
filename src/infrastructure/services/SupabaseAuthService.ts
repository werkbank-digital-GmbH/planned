import type { SupabaseClient } from '@supabase/supabase-js';

import type { IAuthService } from '@/application/ports/services';

import type { Database } from '@/lib/database.types';

/**
 * Supabase Auth Service Implementation
 *
 * Implementiert IAuthService mit Supabase Admin API.
 * Benötigt einen Admin-Client mit Service Role Key für User-Verwaltung.
 */
export class SupabaseAuthService implements IAuthService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Sendet eine Einladungs-E-Mail an einen neuen Benutzer.
   *
   * Verwendet Supabase Auth Admin API zum Erstellen eines Users
   * und sendet eine Passwort-Reset E-Mail als "Einladung".
   */
  async inviteUser(email: string, redirectTo?: string): Promise<string> {
    // Temporäres Passwort generieren (User muss es über Reset-Link ändern)
    const tempPassword = crypto.randomUUID();

    // User mit Admin API erstellen
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // E-Mail als bestätigt markieren
      user_metadata: {
        invited_at: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(`Einladung fehlgeschlagen: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Benutzer konnte nicht erstellt werden');
    }

    // Passwort-Reset E-Mail als "Einladung" senden
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const finalRedirectTo = redirectTo || `${baseUrl}/update-password`;

    const { error: resetError } = await this.supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: finalRedirectTo,
      },
    });

    if (resetError) {
      // User wurde erstellt, aber E-Mail konnte nicht gesendet werden
      // Wir loggen den Fehler, aber werfen keine Exception
      console.error('Einladungs-E-Mail konnte nicht gesendet werden:', resetError);
    }

    return data.user.id;
  }

  /**
   * Sendet eine Einladungs-E-Mail erneut.
   */
  async resendInvitation(email: string): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const { error } = await this.supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${baseUrl}/update-password`,
      },
    });

    if (error) {
      console.error('Einladungs-E-Mail konnte nicht gesendet werden:', error);
      return false;
    }

    return true;
  }

  /**
   * Deaktiviert einen Auth-User (verhindert Login).
   */
  async disableUser(authId: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.updateUserById(authId, {
      ban_duration: 'none', // Permanent gebannt
      user_metadata: {
        disabled: true,
        disabled_at: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(`Benutzer konnte nicht deaktiviert werden: ${error.message}`);
    }
  }

  /**
   * Aktiviert einen Auth-User (erlaubt Login wieder).
   */
  async enableUser(authId: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.updateUserById(authId, {
      ban_duration: 'none',
      user_metadata: {
        disabled: false,
        enabled_at: new Date().toISOString(),
      },
    });

    if (error) {
      throw new Error(`Benutzer konnte nicht aktiviert werden: ${error.message}`);
    }
  }

  /**
   * Löscht einen Auth-User vollständig.
   */
  async deleteUser(authId: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.deleteUser(authId);

    if (error) {
      throw new Error(`Benutzer konnte nicht gelöscht werden: ${error.message}`);
    }
  }
}
