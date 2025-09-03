import './globals.css';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Genesis Gates',
  description: 'Family history, decentralized.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container py-3 flex items-center gap-3">
            <Image src="/logo.svg" alt="Logo" width={160} height={40} />
            <nav className="ml-auto flex items-center gap-3">
              <Link className="hover:underline" href="/">Home</Link>
              <Link className="hover:underline" href="/dashboard">Dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Genesis Gates
        </footer>
      </body>
    </html>
  );
}
