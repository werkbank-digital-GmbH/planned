import { BottomNavigation } from '@/presentation/components/mobile/BottomNavigation';

/**
 * Mobile Layout
 *
 * Layout für mobile Ansichten (gewerbliche Mitarbeiter).
 *
 * Features:
 * - Bottom Navigation
 * - Safe Area Padding für iPhone
 * - Volle Höhe ohne Scrollbar auf Navigation
 */
export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col pb-16">
      <main className="flex-1">{children}</main>
      <BottomNavigation />
    </div>
  );
}
