import Link from 'next/link';

import { Button } from '@/presentation/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="text-xl font-bold text-black">
          planned<span className="text-accent">.</span>
        </div>
        <Link href="/login">
          <Button variant="outline">Anmelden</Button>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold text-black">
          planned<span className="text-accent">.</span>
        </h1>
        <p className="mt-4 text-gray">Kapazitäts- und Einsatzplanung für Holzbauunternehmen</p>
      </main>
    </div>
  );
}
