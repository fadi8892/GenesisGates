// components/trees/NewTreeClient.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

export default function NewTreeClient() {
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    // Put your client-side handler here or call an API route / server action
    startTransition(() => {
      // example: fetch('/api/trees', { method: 'POST', body: JSON.stringify({ name }) })
      console.log('Creating tree:', name);
    });
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold">Start a New Tree</h1>

      <div className="mt-6 flex items-center gap-3">
        <input
          className="border rounded-xl px-3 py-2 w-64"
          placeholder="Tree name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button
          type="button"
          className="rounded-xl border px-4 py-2 disabled:opacity-60"
          onClick={handleCreate}
          disabled={isPending || !name}
        >
          {isPending ? 'Creating…' : 'Create'}
        </button>

        <Link href="/trees" className="rounded-xl border px-4 py-2">
          Back
        </Link>
      </div>
    </main>
  );
}
