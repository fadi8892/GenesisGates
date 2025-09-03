import './globals.css';
import Image from 'next/image';
import Link from 'next/link';
import { getSessionOrNull } from '@/lib/auth';

export const metadata = { title: 'Genesis Gates', description: 'Family history, decentralized.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSessionOrNull();
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container py-3 flex items-center gap-3">
            <Image src="/logo.svg" alt="Logo" width={160} height={40} />
            <nav className="ml-auto flex items-center gap-3">
              <Link className="hover:underline" href="/">Home</Link>
              {session ? (
                <>
                  <Link className="hover:underline" href="/dashboard">Dashboard</Link>
                  <form action="/api/auth/signout" method="post">
                    <button className="text-sm text-slate-600 hover:text-slate-900" type="submit">Sign out</button>
                  </form>
                </>
              ) : null}
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} Genesis Gates</footer>
      </body>
    </html>
  );
}
