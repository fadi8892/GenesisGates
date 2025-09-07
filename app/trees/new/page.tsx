// app/trees/new/page.tsx
// Server Component (no "use client") — no event handlers here.
import Link from 'next/link';

export const dynamic = 'force-static';

export default function NewTreePage() {
  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-semibold">Start a New Tree</h1>
      <p className="mt-3 text-gray-700">
        This is a placeholder. Hook this up to your create-tree API when ready.
      </p>

      <form
        // You can wire this up to a server action later.
        // For now we just point "action" back to /trees to avoid client JS.
        action="/trees"
        method="get"
        className="mt-8 grid gap-4 max-w-md"
      >
        <label className="grid gap-2">
          <span className="text-sm text-gray-600">Tree Name</span>
          <input
            name="name"
            type="text"
            placeholder="e.g. Douri Family Tree"
            className="w-full rounded-lg border px-3 py-2"
          />
        </label>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 hover:shadow"
          >
            Create
          </button>
          <Link href="/trees" className="rounded-lg border px-4 py-2 hover:shadow">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
