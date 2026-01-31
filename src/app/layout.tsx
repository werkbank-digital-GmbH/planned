import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/presentation/providers';

import './globals.css';

export const metadata: Metadata = {
  title: 'planned. | Kapazitäts- und Einsatzplanung',
  description: 'Kapazitäts- und Einsatzplanungs-App für Holzbauunternehmen',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
