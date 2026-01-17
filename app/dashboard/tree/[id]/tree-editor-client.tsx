'use client';

import dynamic from 'next/dynamic';

/**
 * Client-only wrapper for the heavy FamilyFlow editor.
 *
 * Next.js (App Router) treats route `page.tsx` files as Server Components by default.
 * `next/dynamic({ ssr: false })` is only allowed inside Client Components, so we
 * keep the server page lightweight and load the editor here.
 */
const FamilyFlow = dynamic(() => import('./FamilyFlow'), {
  ssr: false,
  // Optional: keep a tiny placeholder so the header paints instantly.
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-white/40 text-sm">
      Loading editor…
    </div>
  ),
});

export default function TreeEditorClient({ treeId }: { treeId: string }) {
  return <FamilyFlow treeId={treeId} />;
}
