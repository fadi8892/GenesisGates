import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import SignOutButton from "@/components/SignOutButton";
import { getSessionOrNull } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Genesis Gates",
  description: "Decentralized Family Tree Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getSessionOrNull();
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header with clickable logo */}
        <header className="flex items-center p-4 shadow-md">
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

          <nav className="ml-auto flex gap-6">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/about" className="hover:underline">
              About
            </Link>
            <Link href="/premium" className="hover:underline">
              Premium
            </Link>
            {session && <SignOutButton />}
          </nav>
        </header>

        {/* Main content */}
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}