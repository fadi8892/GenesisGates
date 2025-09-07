// app/trees/page.tsx
// Server Component — no event handlers.
import Link from 'next/link';

export const dynamic = 'force-static';

export default function TreesIndexPage() {
  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold">Your Trees</h1>
      <p className="mt-3 text-gray-700">
        No backend connected yet. This is a placeholder page.
      </p>

      <div className="mt-8">
        <Link
          href="/trees/new"
          className="inline-block rounded-xl px-4 py-2 border hover:shadow"
        >
          Start a New Tree
        </Link>
      </div>
    </main>
  );
}
