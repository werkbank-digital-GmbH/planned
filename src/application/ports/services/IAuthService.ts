/**
 * Auth Service Interface
 *
 * Abstraktion für Authentifizierungs-Operationen.
 * Wird von der Infrastructure-Schicht implementiert (z.B. SupabaseAuthService).
 */
export interface IAuthService {
  /**
   * Sendet eine Einladungs-E-Mail an einen neuen Benutzer.
   * Der Benutzer kann über den Link in der E-Mail sein Passwort setzen.
   *
   * @param email - E-Mail-Adresse des einzuladenden Benutzers
   * @param redirectTo - Optional: URL wohin der Benutzer nach Registrierung weitergeleitet wird
   * @returns Die Auth-User-ID wenn erfolgreich
   * @throws Error wenn die Einladung fehlschlägt
   */
  inviteUser(email: string, redirectTo?: string): Promise<string>;

  /**
   * Sendet eine Einladungs-E-Mail erneut.
   *
   * @param email - E-Mail-Adresse des Benutzers
   * @returns true wenn erfolgreich
   */
  resendInvitation(email: string): Promise<boolean>;

  /**
   * Deaktiviert einen Auth-User (verhindert Login).
   *
   * @param authId - Supabase Auth User ID
   */
  disableUser(authId: string): Promise<void>;

  /**
   * Aktiviert einen Auth-User (erlaubt Login wieder).
   *
   * @param authId - Supabase Auth User ID
   */
  enableUser(authId: string): Promise<void>;

  /**
   * Löscht einen Auth-User vollständig.
   *
   * @param authId - Supabase Auth User ID
   */
  deleteUser(authId: string): Promise<void>;
}
