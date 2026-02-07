import { createHmac } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { AsanaService } from '@/infrastructure/services/AsanaService';
import { EncryptionService } from '@/infrastructure/services/EncryptionService';
import { createAdminSupabaseClient } from '@/infrastructure/supabase/admin';

import { syncUsersAfterAsanaConnect } from '@/presentation/actions/integrations';

import { serverEnv } from '@/lib/env-server';

/**
 * Verifiziert einen signierten OAuth State-Token.
 * Gibt die tenant_id zurück oder null bei ungültigem/abgelaufenem Token.
 */
function verifySignedState(state: string, secret: string): { tenantId: string } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const [tenantId, timestamp, signature] = decoded.split(':');

    if (!tenantId || !timestamp || !signature) return null;

    // Prüfe ob nicht älter als 10 Minuten
    const age = Date.now() - parseInt(timestamp);
    if (age > 10 * 60 * 1000) return null;

    // Signatur verifizieren
    const data = `${tenantId}:${timestamp}`;
    const expected = createHmac('sha256', secret).update(data).digest('hex');
    if (signature !== expected) return null;

    return { tenantId };
  } catch {
    return null;
  }
}

/**
 * GET /api/integrations/asana/callback
 *
 * Verarbeitet den OAuth Callback von Asana.
 * Tauscht den Authorization Code gegen Tokens und speichert sie verschlüsselt.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
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
  const clientId = serverEnv.ASANA_CLIENT_ID;
  const clientSecret = serverEnv.ASANA_CLIENT_SECRET;
  const redirectUri = serverEnv.ASANA_REDIRECT_URI;
  const encryptionKey = serverEnv.ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    console.error('Missing environment variables for Asana OAuth');
    return NextResponse.redirect(`${settingsUrl}?error=config_error`);
  }

  // State verifizieren (HMAC-signiert)
  const stateResult = verifySignedState(state, encryptionKey);
  if (!stateResult) {
    return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
  }

  const { tenantId } = stateResult;

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
          tenant_id: tenantId,
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

    // User-Mapping nach erfolgreichem Connect (fire-and-forget)
    syncUsersAfterAsanaConnect(tenantId).catch(() => {
      // Silent fail - User-Mapping ist nicht kritisch für OAuth-Erfolg
    });

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
