// components/trees/TreesClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TreesClient() {
  const [count, setCount] = useState(0);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold">Your Trees</h1>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          className="rounded-xl border px-4 py-2"
          onClick={() => setCount((n) => n + 1)}
        >
          Demo Button (count {count})
        </button>

        <Link href="/trees/new" className="rounded-xl border px-4 py-2">
          Start New Tree
        </Link>
      </div>

      {/* render your trees list here purely as data */}
    </main>
  );
}
