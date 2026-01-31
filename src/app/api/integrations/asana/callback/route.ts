import { type NextRequest, NextResponse } from 'next/server';

import { AsanaService } from '@/infrastructure/services/AsanaService';
import { EncryptionService } from '@/infrastructure/services/EncryptionService';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

/**
 * GET /api/integrations/asana/callback
 *
 * Verarbeitet den OAuth Callback von Asana.
 * Tauscht den Authorization Code gegen Tokens und speichert sie verschlüsselt.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // tenant_id
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const settingsUrl = `${appUrl}/einstellungen/integrationen`;

  // Fehler von Asana
  if (error) {
    console.error('Asana OAuth error:', error);
    return NextResponse.redirect(
      `${settingsUrl}?error=asana_denied&message=${encodeURIComponent(error)}`
    );
  }

  // Validierung
  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_request`);
  }

  // Environment Variables prüfen
  const clientId = process.env.ASANA_CLIENT_ID;
  const clientSecret = process.env.ASANA_CLIENT_SECRET;
  const redirectUri = process.env.ASANA_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    console.error('Missing environment variables for Asana OAuth');
    return NextResponse.redirect(`${settingsUrl}?error=config_error`);
  }

  try {
    // Token Exchange
    const asanaService = new AsanaService({ clientId, clientSecret });
    const tokens = await asanaService.exchangeCodeForToken(code, redirectUri);

    // Workspaces laden um den Default-Workspace zu ermitteln
    const workspaces = await asanaService.getWorkspaces(tokens.access_token);
    const defaultWorkspace = workspaces[0]; // Erster Workspace als Default

    if (!defaultWorkspace) {
      return NextResponse.redirect(`${settingsUrl}?error=no_workspace`);
    }

    // Token verschlüsseln
    const encryptionService = new EncryptionService(encryptionKey);
    const encryptedAccessToken = encryptionService.encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptionService.encrypt(tokens.refresh_token)
      : null;

    // Token-Ablaufzeit berechnen
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Credentials speichern (mit Admin-Client wegen RLS)
    const supabase = createAdminSupabaseClient();
    const { error: upsertError } = await supabase
      .from('integration_credentials')
      .upsert(
        {
          tenant_id: state,
          asana_access_token: encryptedAccessToken,
          asana_refresh_token: encryptedRefreshToken,
          asana_token_expires_at: expiresAt,
          asana_workspace_id: defaultWorkspace.gid,
        },
        { onConflict: 'tenant_id' }
      );

    if (upsertError) {
      console.error('Error saving Asana credentials:', upsertError);
      return NextResponse.redirect(`${settingsUrl}?error=save_failed`);
    }

    // Erfolg
    return NextResponse.redirect(
      `${settingsUrl}?success=asana_connected&workspace=${encodeURIComponent(defaultWorkspace.name)}`
    );
  } catch (err) {
    console.error('Asana OAuth callback error:', err);
    return NextResponse.redirect(
      `${settingsUrl}?error=oauth_failed&message=${encodeURIComponent(
        err instanceof Error ? err.message : 'Unknown error'
      )}`
    );
  }
}
