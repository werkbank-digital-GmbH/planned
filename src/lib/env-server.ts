/**
 * Server-only Environment Variables
 *
 * Diese Datei darf NUR auf dem Server importiert werden.
 * Der Import im Browser führt zu einem Build-Fehler.
 */

import 'server-only';

import { z } from 'zod';

import { clientEnv, type ClientEnv } from './env-client';

/**
 * Schema für Server-seitige Umgebungsvariablen
 * Diese sind nur auf dem Server verfügbar (nicht im Client-Bundle)
 */
const serverEnvSchema = z.object({
  // Supabase (Server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Encryption (für API-Token-Verschlüsselung)
  ENCRYPTION_KEY: z.string().optional(),

  // Cron Jobs
  CRON_SECRET: z.string().optional(),

  // Asana OAuth
  ASANA_CLIENT_ID: z.string().optional(),
  ASANA_CLIENT_SECRET: z.string().optional(),

  // Upstash Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Anthropic AI (Insights-Generierung)
  ANTHROPIC_API_KEY: z.string().optional(),
});

/**
 * Typ für Server-Umgebungsvariablen
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Kombinierter Typ für alle Umgebungsvariablen
 */
export type Env = ServerEnv & ClientEnv;

/**
 * Validiert die Server-Umgebungsvariablen
 */
function validateServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    ASANA_CLIENT_ID: process.env.ASANA_CLIENT_ID,
    ASANA_CLIENT_SECRET: process.env.ASANA_CLIENT_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  });

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);

    // In Development nur warnen, in Production abbrechen
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid server environment variables');
    }

    // In Development mit Fallback-Werten weitermachen
    console.warn('⚠️ Running with missing server environment variables in development mode');

    return {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
      ASANA_CLIENT_ID: process.env.ASANA_CLIENT_ID,
      ASANA_CLIENT_SECRET: process.env.ASANA_CLIENT_SECRET,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    };
  }

  return parsed.data;
}

/**
 * Validierte Server-Umgebungsvariablen
 */
export const serverEnv = validateServerEnv();

/**
 * Alle Umgebungsvariablen (Server + Client)
 *
 * Verwende dieses Objekt für serverseitigen Code, der beide braucht.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env-server';
 *
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
 * const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
 * ```
 */
export const env: Env = {
  ...serverEnv,
  ...clientEnv,
};

// Re-export clientEnv for convenience
export { clientEnv };
