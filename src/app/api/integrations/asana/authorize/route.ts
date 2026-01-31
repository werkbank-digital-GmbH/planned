import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/infrastructure/supabase/server';

/**
 * GET /api/integrations/asana/authorize
 *
 * Leitet den User zu Asana OAuth weiter.
 * Der Tenant-ID wird als State-Parameter für Security mitgegeben.
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
  const clientId = process.env.ASANA_CLIENT_ID;
  const redirectUri = process.env.ASANA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('Asana OAuth environment variables missing');
    return NextResponse.json(
      { error: 'Asana Integration nicht konfiguriert' },
      { status: 500 }
    );
  }

  // Asana OAuth URL generieren
  const authUrl = new URL('https://app.asana.com/-/oauth_authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', userData.tenant_id);

  return NextResponse.redirect(authUrl);
}
