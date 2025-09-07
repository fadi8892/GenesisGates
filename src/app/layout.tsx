import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

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
      <body className="font-sans">
        {/* Header with clickable logo */}
        <header className="flex items-center p-4 bg-[#1B1F2C] border-b border-[#574CDC]/20">
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

          <nav className="ml-auto flex gap-6 text-sm text-[#F9F9F9]">
            <Link href="/dashboard" className="hover:text-[#574CDC] transition">
              Dashboard
            </Link>
            <Link href="/about" className="hover:text-[#574CDC] transition">
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