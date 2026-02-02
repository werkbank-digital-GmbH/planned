import { readFileSync } from 'fs';
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Lade .env.local manuell für Tests
function loadEnvFile(): Record<string, string> {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    return env;
  } catch {
    // .env.local nicht vorhanden - okay für Unit-Tests
    return {};
  }
}

const envVars = loadEnvFile();

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    exclude: ['node_modules', 'tests/e2e'],
    env: {
      ...envVars,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock 'server-only' für Tests (das Paket wirft in Client-Umgebung einen Fehler)
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
});
