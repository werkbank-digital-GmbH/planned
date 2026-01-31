/**
 * Auth Layout
 *
 * Layout für alle Authentifizierungs-Seiten (Login, Reset Password, etc.)
 * Zentriertes Layout mit hellgrauem Hintergrund.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-light/30">
      <div className="w-full max-w-md px-4">{children}</div>
    </div>
  );
}
