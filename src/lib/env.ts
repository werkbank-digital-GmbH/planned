/**
 * Environment Variable Validation
 *
 * Zentralisierte Validierung aller Umgebungsvariablen mit Zod.
 * Wirft einen Fehler beim Build, wenn Pflicht-Variablen fehlen.
 */

import { z } from 'zod';

/**
 * Schema für Server-seitige Umgebungsvariablen
 * Diese sind nur auf dem Server verfügbar (nicht im Client-Bundle)
 */
const serverEnvSchema = z.object({
  // Supabase (Server-only)
  SUPABASE_SECRET_KEY: z.string().min(1, 'SUPABASE_SECRET_KEY is required'),

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
});

/**
 * Schema für Client-seitige Umgebungsvariablen
 * Diese werden im Client-Bundle exponiert (NEXT_PUBLIC_ Präfix)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('planned.'),
});

/**
 * Kombiniertes Schema für alle Umgebungsvariablen
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

/**
 * Typ für validierte Umgebungsvariablen
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validiert die Umgebungsvariablen
 *
 * Im Development werden fehlende optionale Variablen toleriert.
 * In Production müssen alle erforderlichen Variablen gesetzt sein.
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    // Server
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    ASANA_CLIENT_ID: process.env.ASANA_CLIENT_ID,
    ASANA_CLIENT_SECRET: process.env.ASANA_CLIENT_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Client
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);

    // In Development nur warnen, in Production abbrechen
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment variables');
    }

    // In Development mit Fallback-Werten weitermachen
    console.warn('⚠️ Running with missing environment variables in development mode');

    return {
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
      ASANA_CLIENT_ID: process.env.ASANA_CLIENT_ID,
      ASANA_CLIENT_SECRET: process.env.ASANA_CLIENT_SECRET,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'planned.',
    };
  }

  return parsed.data;
}

/**
 * Validierte Umgebungsvariablen
 *
 * Verwende dieses Objekt statt direktem Zugriff auf process.env
 * für typsichere Umgebungsvariablen.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 *
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
 * ```
 */
export const env = validateEnv();

/**
 * Nur Client-seitige Umgebungsvariablen
 *
 * Sicher für Client Components und Browser-Code.
 */
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: env.NEXT_PUBLIC_APP_NAME,
} as const;
