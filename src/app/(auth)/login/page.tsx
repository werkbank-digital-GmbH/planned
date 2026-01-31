/**
 * Login Page
 *
 * @see FEATURES.md F1.1 für Akzeptanzkriterien
 */

import { LoginForm } from '@/presentation/components/auth/LoginForm';

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-black">planned.</h1>
        <p className="text-gray mt-2">Kapazitätsplanung für Holzbau</p>
      </div>

      {/* Login Form */}
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
