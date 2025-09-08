import { notFound } from 'next/navigation';

// A placeholder page for individual person profiles. In a future version of
// GenesisGates this page will show detailed information about the selected
// individual, including their life events, photos, memories and posts. For
// deceased people (as determined by the tree owner), admins will be able to
// add posts, upload images and share stories. For living people, a
// verification workflow will allow the real person to claim their profile and
// contribute content. At present this page serves as a stub to be filled
// out as the database schema and APIs are expanded.

export default async function PersonPage({ params }: { params: { id: string } }) {
  const { id } = params;
  // Until we have a proper API to fetch person details, just display the id.
  if (!id) return notFound();
  return (
    <div className="card space-y-2">
      <div className="text-xl font-semibold">Person Profile</div>
      <div className="text-sm text-slate-400">Profile ID: {id}</div>
      <div className="text-sm">This page is under construction. In a future update it will show detailed information about this person, allow posting of photos and memories, and enable identity claims for living individuals.</div>
    </div>
  );
}