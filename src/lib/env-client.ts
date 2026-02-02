/**
 * Client-safe Environment Variables
 *
 * Diese Datei kann sicher im Browser importiert werden.
 * Enthält nur NEXT_PUBLIC_* Variablen.
 */

import { z } from 'zod';

/**
 * Schema für Client-seitige Umgebungsvariablen
 * Diese werden im Client-Bundle exponiert (NEXT_PUBLIC_ Präfix)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().optional().default('planned.'),
});

/**
 * Typ für Client-Umgebungsvariablen
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validiert die Client-Umgebungsvariablen
 */
function validateClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  });

  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:', parsed.error.flatten().fieldErrors);

    // In Development nur warnen, in Production abbrechen
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid client environment variables');
    }

    // In Development mit Fallback-Werten weitermachen
    console.warn('⚠️ Running with missing client environment variables in development mode');

    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'planned.',
    };
  }

  return parsed.data;
}

/**
 * Validierte Client-Umgebungsvariablen
 *
 * Sicher für Client Components und Browser-Code.
 *
 * @example
 * ```ts
 * import { clientEnv } from '@/lib/env-client';
 *
 * const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
 * ```
 */
export const clientEnv = validateClientEnv();
