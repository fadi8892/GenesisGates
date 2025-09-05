import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "GenesisGates",
  description: "Interactive, collaborative family history."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <header className="bg-indigo-700 text-white">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2"/>
              </svg>
              GenesisGates
            </Link>
            <nav className="flex items-center gap-3">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
        <footer className="mt-10 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} GenesisGates — Family, forever.
        </footer>
      </body>
    </html>
  );
}
