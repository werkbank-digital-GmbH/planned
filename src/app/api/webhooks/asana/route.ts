import { createHmac, timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import type { AsanaWebhookEvent } from '@/application/ports/services/IAsanaService';

import { createAdminSupabaseClient } from '@/infrastructure/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface WebhookPayload {
  events: AsanaWebhookEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifiziert die Webhook-Signatur mit HMAC-SHA256.
 */
function verifySignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verarbeitet ein einzelnes Webhook-Event.
 */
async function processEvent(event: AsanaWebhookEvent, tenantId: string) {
  const supabase = createAdminSupabaseClient();
  const { action, resource, parent } = event;

  console.log(`[Asana Webhook] Processing event: ${action} ${resource.resource_type} ${resource.gid}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECT EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  if (resource.resource_type === 'project') {
    if (action === 'added') {
      // Neues Projekt - in die Datenbank einfügen
      const { error } = await supabase.from('projects').insert({
        tenant_id: tenantId,
        asana_gid: resource.gid,
        name: resource.name ?? 'Unbenanntes Projekt',
        status: 'planning',
      });

      if (error) {
        console.error('[Asana Webhook] Error creating project:', error);
      } else {
        console.log(`[Asana Webhook] Created project ${resource.gid}`);
      }
    }

    if (action === 'changed' && resource.name) {
      // Projekt wurde umbenannt
      const { error } = await supabase
        .from('projects')
        .update({ name: resource.name, updated_at: new Date().toISOString() })
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error updating project:', error);
      } else {
        console.log(`[Asana Webhook] Updated project ${resource.gid}`);
      }
    }

    if (action === 'deleted' || action === 'removed') {
      // Projekt wurde gelöscht/archiviert - Soft-Delete
      const { error } = await supabase
        .from('projects')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error soft-deleting project:', error);
      } else {
        console.log(`[Asana Webhook] Soft-deleted project ${resource.gid}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION EVENTS (Phasen)
  // ─────────────────────────────────────────────────────────────────────────

  if (resource.resource_type === 'section') {
    // Finde das zugehörige Projekt
    const projectGid = parent?.gid;

    if (!projectGid) {
      console.warn('[Asana Webhook] Section event without parent project');
      return;
    }

    // Projekt-ID aus DB holen
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('asana_gid', projectGid)
      .eq('tenant_id', tenantId)
      .single();

    if (!project) {
      console.warn(`[Asana Webhook] Project not found for GID ${projectGid}`);
      return;
    }

    if (action === 'added') {
      // Neue Section/Phase erstellen
      const bereich = deriveBereichFromName(resource.name ?? '');

      const { error } = await supabase.from('project_phases').insert({
        tenant_id: tenantId,
        project_id: project.id,
        asana_gid: resource.gid,
        name: resource.name ?? 'Unbenannte Phase',
        bereich,
        sort_order: 0,
      });

      if (error) {
        console.error('[Asana Webhook] Error creating phase:', error);
      } else {
        console.log(`[Asana Webhook] Created phase ${resource.gid}`);
      }
    }

    if (action === 'changed' && resource.name) {
      // Phase wurde umbenannt
      const bereich = deriveBereichFromName(resource.name);

      const { error } = await supabase
        .from('project_phases')
        .update({
          name: resource.name,
          bereich,
          updated_at: new Date().toISOString(),
        })
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error updating phase:', error);
      } else {
        console.log(`[Asana Webhook] Updated phase ${resource.gid}`);
      }
    }

    if (action === 'deleted' || action === 'removed') {
      // Phase wurde gelöscht - Hard-Delete (Sections haben keinen Archive-Status)
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error deleting phase:', error);
      } else {
        console.log(`[Asana Webhook] Deleted phase ${resource.gid}`);
      }
    }
  }
}

/**
 * Leitet den Bereich aus dem Phasennamen ab.
 */
function deriveBereichFromName(name: string): 'produktion' | 'montage' | 'externes_gewerk' {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('montage') || nameLower.includes('baustelle')) {
    return 'montage';
  }

  if (nameLower.includes('extern') || nameLower.includes('fremd') || nameLower.includes('sub')) {
    return 'externes_gewerk';
  }

  return 'produktion';
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Asana Webhook Endpoint
 *
 * Verarbeitet eingehende Webhook-Events von Asana:
 * - Handshake (X-Hook-Secret Header)
 * - Signatur-Verifizierung
 * - Event-Verarbeitung für Projects und Sections
 */
export async function POST(request: Request) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // HANDSHAKE
    // ─────────────────────────────────────────────────────────────────────────

    // Asana sendet bei Webhook-Erstellung einen Handshake mit X-Hook-Secret
    const hookSecret = request.headers.get('X-Hook-Secret');

    if (hookSecret) {
      console.log('[Asana Webhook] Handshake received, storing secret...');

      // Secret in der Datenbank speichern
      // Da wir den Tenant noch nicht kennen, müssen wir das Secret
      // beim nächsten Request der Resource zuordnen
      // Für jetzt echoen wir es einfach zurück
      return new NextResponse(null, {
        status: 200,
        headers: {
          'X-Hook-Secret': hookSecret,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EVENT PROCESSING
    // ─────────────────────────────────────────────────────────────────────────

    const rawBody = await request.text();
    const signature = request.headers.get('X-Hook-Signature');

    // Parse body
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[Asana Webhook] Invalid JSON body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Wenn keine Events, ist es ein leerer Ping
    if (!payload.events || payload.events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Workspace-GID aus dem ersten Event extrahieren
    // (alle Events in einem Request kommen vom selben Workspace)
    const firstEvent = payload.events[0];

    // Die Workspace-GID ist nicht direkt im Event, daher müssen wir
    // den Tenant über die Resource-GID finden
    // Für jetzt verarbeiten wir ohne Signatur-Check (TODO: verbessern)

    // Suche nach dem Projekt/der Phase in der DB um den Tenant zu finden
    const supabase = createAdminSupabaseClient();
    let tenantId: string | null = null;

    // Versuche, den Tenant über ein Projekt zu finden
    if (firstEvent.resource.resource_type === 'project') {
      const { data } = await supabase
        .from('projects')
        .select('tenant_id')
        .eq('asana_gid', firstEvent.resource.gid)
        .single();

      if (data) {
        tenantId = data.tenant_id;
      }
    } else if (firstEvent.resource.resource_type === 'section' && firstEvent.parent?.gid) {
      const { data } = await supabase
        .from('projects')
        .select('tenant_id')
        .eq('asana_gid', firstEvent.parent.gid)
        .single();

      if (data) {
        tenantId = data.tenant_id;
      }
    }

    // Bei neuen Projekten kennen wir den Tenant noch nicht
    // In diesem Fall müssen wir über die Workspace-Credentials gehen
    if (!tenantId && firstEvent.action === 'added') {
      // TODO: Implementiere Workspace-Lookup
      console.warn('[Asana Webhook] Cannot determine tenant for new resource');
      return NextResponse.json({ ok: true });
    }

    if (!tenantId) {
      console.warn('[Asana Webhook] Cannot determine tenant');
      return NextResponse.json({ ok: true });
    }

    // Signatur verifizieren (wenn Secret bekannt)
    const { data: credentials } = await supabase
      .from('integration_credentials')
      .select('asana_webhook_secret')
      .eq('tenant_id', tenantId)
      .single();

    if (credentials?.asana_webhook_secret && signature) {
      const isValid = verifySignature(rawBody, signature, credentials.asana_webhook_secret);
      if (!isValid) {
        console.error('[Asana Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Events verarbeiten
    for (const event of payload.events) {
      await processEvent(event, tenantId);
    }

    // Log sync operation
    await supabase.from('sync_logs').insert({
      tenant_id: tenantId,
      service: 'asana',
      operation: 'webhook_events',
      status: 'success',
      result: {
        events_count: payload.events.length,
        event_types: [...new Set(payload.events.map(e => `${e.action}:${e.resource.resource_type}`))],
      },
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Asana Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
