import { createHmac, timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import type { AsanaWebhookEvent } from '@/application/ports/services/IAsanaService';

import { createAdminSupabaseClient } from '@/infrastructure/supabase';

import type { SyncDetail } from '@/presentation/stores/notificationStore';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface WebhookPayload {
  events: AsanaWebhookEvent[];
}

interface ProcessedEvent {
  type: 'projects' | 'phases';
  action: 'created' | 'updated' | 'deleted';
  name: string;
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
 * Gibt das verarbeitete Event zurück für die Notification.
 */
async function processEvent(
  event: AsanaWebhookEvent,
  tenantId: string
): Promise<ProcessedEvent | null> {
  const supabase = createAdminSupabaseClient();
  const { action, resource, parent } = event;

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECT EVENTS
  // ─────────────────────────────────────────────────────────────────────────

  if (resource.resource_type === 'project') {
    const name = resource.name ?? 'Unbenanntes Projekt';

    if (action === 'added') {
      const { error } = await supabase.from('projects').insert({
        tenant_id: tenantId,
        asana_gid: resource.gid,
        name,
        status: 'planning',
      });

      if (error) {
        console.error('[Asana Webhook] Error creating project:', error);
        return null;
      }
      console.log(`[Asana Webhook] Created project ${resource.gid}`);
      return { type: 'projects', action: 'created', name };
    }

    if (action === 'changed' && resource.name) {
      const { error } = await supabase
        .from('projects')
        .update({ name: resource.name, updated_at: new Date().toISOString() })
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error updating project:', error);
        return null;
      }
      console.log(`[Asana Webhook] Updated project ${resource.gid}`);
      return { type: 'projects', action: 'updated', name: resource.name };
    }

    if (action === 'deleted' || action === 'removed') {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error soft-deleting project:', error);
        return null;
      }
      console.log(`[Asana Webhook] Soft-deleted project ${resource.gid}`);
      return { type: 'projects', action: 'deleted', name };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION EVENTS (Phasen)
  // ─────────────────────────────────────────────────────────────────────────

  if (resource.resource_type === 'section') {
    const projectGid = parent?.gid;
    const name = resource.name ?? 'Unbenannte Phase';

    if (!projectGid) {
      console.warn('[Asana Webhook] Section event without parent project');
      return null;
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('asana_gid', projectGid)
      .eq('tenant_id', tenantId)
      .single();

    if (!project) {
      console.warn(`[Asana Webhook] Project not found for GID ${projectGid}`);
      return null;
    }

    if (action === 'added') {
      const bereich = deriveBereichFromName(name);

      const { error } = await supabase.from('project_phases').insert({
        tenant_id: tenantId,
        project_id: project.id,
        asana_gid: resource.gid,
        name,
        bereich,
        sort_order: 0,
      });

      if (error) {
        console.error('[Asana Webhook] Error creating phase:', error);
        return null;
      }
      console.log(`[Asana Webhook] Created phase ${resource.gid}`);
      return { type: 'phases', action: 'created', name };
    }

    if (action === 'changed' && resource.name) {
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
        return null;
      }
      console.log(`[Asana Webhook] Updated phase ${resource.gid}`);
      return { type: 'phases', action: 'updated', name: resource.name };
    }

    if (action === 'deleted' || action === 'removed') {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('asana_gid', resource.gid)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('[Asana Webhook] Error deleting phase:', error);
        return null;
      }
      console.log(`[Asana Webhook] Deleted phase ${resource.gid}`);
      return { type: 'phases', action: 'deleted', name };
    }
  }

  return null;
}

/**
 * Sendet eine Sync-Benachrichtigung an alle Clients des Tenants via Supabase Realtime.
 */
async function broadcastSyncNotification(tenantId: string, details: SyncDetail[]) {
  if (details.length === 0) return;

  const supabase = createAdminSupabaseClient();
  const channel = supabase.channel(`tenant:${tenantId}`);

  await channel.send({
    type: 'broadcast',
    event: 'sync_notification',
    payload: {
      direction: 'incoming',
      summary: 'Asana hat ein Update gesendet',
      details,
    },
  });

  await supabase.removeChannel(channel);
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
    // In diesem Fall loggen wir das Event für spätere Verarbeitung beim nächsten Sync
    if (!tenantId && firstEvent.action === 'added') {
      console.log('[Asana Webhook] New resource detected, will be synced on next cron run');
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

    // Events verarbeiten und Details sammeln
    const processedEvents: ProcessedEvent[] = [];
    for (const event of payload.events) {
      const result = await processEvent(event, tenantId);
      if (result) {
        processedEvents.push(result);
      }
    }

    // Sync-Benachrichtigung an Clients senden
    if (processedEvents.length > 0) {
      const details: SyncDetail[] = processedEvents.map((e) => ({
        type: e.type,
        action: e.action,
        name: e.name,
      }));
      await broadcastSyncNotification(tenantId, details);
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
