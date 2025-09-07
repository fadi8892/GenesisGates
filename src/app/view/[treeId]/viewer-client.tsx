'use client';

import { useEffect, useState } from 'react';

interface Snapshot {
  people: { id: string; name?: string }[];
  links: { parentId: string; childId: string }[];
  spouses: [string, string][];
}

export default function ViewerClient({ treeId }: { treeId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        if (!treeId) throw new Error('invalid');
        const r = await fetch(`/api/public/tree/${treeId}`);
        if (!r.ok) throw new Error('not found');
        const j = await r.json();
        const snap = j?.snapshot || j;
        if (!snap || !Array.isArray(snap.people)) throw new Error('bad');
        setSnapshot(snap);
      } catch {
        setError(true);
      }
    }
    load();
  }, [treeId]);

  if (error) return <div className="card">Tree not found.</div>;
  if (!snapshot) return <div className="card">Loading…</div>;

  return (
    <div className="card">
      <ReadOnlyTreeViewer snapshot={snapshot} />
    </div>
  );
}

function ReadOnlyTreeViewer({ snapshot }: { snapshot: Snapshot }) {
  return (
    <ul className="list-disc pl-6 text-sm">
      {snapshot.people.map(p => (
        <li key={p.id}>{p.name || '—'}</li>
      ))}
    </ul>
  );
}