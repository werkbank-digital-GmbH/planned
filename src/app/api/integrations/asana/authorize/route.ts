import { createHmac } from 'crypto';

import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

import { serverEnv } from '@/lib/env-server';

/**
 * Erstellt einen signierten OAuth State-Token.
 * Format: base64url(tenantId:timestamp:hmac)
 */
function createSignedState(tenantId: string, secret: string): string {
  const timestamp = Date.now().toString();
  const data = `${tenantId}:${timestamp}`;
  const hmac = createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(`${data}:${hmac}`).toString('base64url');
}

/**
 * GET /api/integrations/asana/authorize
 *
 * Leitet den User zu Asana OAuth weiter.
 * Der State-Parameter wird mit HMAC signiert (tenant_id:timestamp:hmac).
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();

  // User authentifizieren
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL));
  }

  // Tenant ID holen
  const { data: userData } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('auth_id', user.id)
    .single();

  if (!userData?.tenant_id) {
    return NextResponse.json(
      { error: 'Kein Tenant gefunden' },
      { status: 400 }
    );
  }

  // Prüfen ob User Admin ist
  const { data: roleData } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single();

  if (roleData?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Nur Administratoren können Integrationen einrichten' },
      { status: 403 }
    );
  }

  // Environment Variables prüfen
  const clientId = serverEnv.ASANA_CLIENT_ID;
  const redirectUri = serverEnv.ASANA_REDIRECT_URI;
  const encryptionKey = serverEnv.ENCRYPTION_KEY;

  if (!clientId || !redirectUri || !encryptionKey) {
    console.error('Asana OAuth environment variables missing');
    return NextResponse.json(
      { error: 'Asana Integration nicht konfiguriert' },
      { status: 500 }
    );
  }

  // Signierten State erstellen
  const state = createSignedState(userData.tenant_id, encryptionKey);

  // Asana OAuth URL generieren
  const authUrl = new URL('https://app.asana.com/-/oauth_authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return NextResponse.redirect(authUrl);
}
