// src/components/SiteHeader.tsx
"use client";

import Logo from "./Logo";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/70 backdrop-blur border-b border-gray-200 dark:bg-neutral-900/70 dark:border-neutral-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Logo size={32} showWordmark />

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/trees" className="hover:underline">View a Tree</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/login" className="rounded-full px-3 py-1 border hover:bg-gray-50 dark:hover:bg-neutral-800">
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
