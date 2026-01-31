import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Bilder von Supabase Storage erlauben
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Strict Mode für bessere Entwicklungserfahrung
  reactStrictMode: true,

  // ESLint während Build ausführen
  eslint: {
    // Warnung: Bei Production-Build Fehler als Fehler behandeln
    ignoreDuringBuilds: false,
  },

  // TypeScript-Fehler als Build-Fehler
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
