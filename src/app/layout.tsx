import "./globals.css";
import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import Link from "next/link";
import Image from "next/image";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "Genesis Gates",
  description: "Decentralized Family Tree Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={orbitron.className}>
        {/* Header with clickable logo */}
        <header className="flex items-center p-4 bg-black/30 backdrop-blur-md border-b border-white/10">
          <Link href="/" passHref>
            <Image
              src="/logo.svg"
              alt="Genesis Gates Logo"
              width={120}
              height={40}
              className="cursor-pointer"
              priority
            />
          </Link>

          <nav className="ml-auto flex gap-6 text-sm text-slate-100">
            <Link href="/dashboard" className="hover:text-fuchsia-400 transition">
              Dashboard
            </Link>
            <Link href="/about" className="hover:text-fuchsia-400 transition">
              About
            </Link>
          </nav>
        </header>

        {/* Main content */}
        <main className="p-6 container">{children}</main>
      </body>
    </html>
  );
}