'use client';

import { useEffect, useState } from 'react';
import FamilyTreeGraph from '@/components/FamilyTreeGraph';

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
  const [mode, setMode] = useState<'radial' | 'vertical'>('radial');
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          className={`tab ${mode === 'radial' ? 'active' : ''}`}
          onClick={() => setMode('radial')}
        >
          Circular
        </button>
        <button
          className={`tab ${mode === 'vertical' ? 'active' : ''}`}
          onClick={() => setMode('vertical')}
        >
          Hierarchy
        </button>
      </div>
      <FamilyTreeGraph
        state={{ people: snapshot.people, links: snapshot.links, spouses: snapshot.spouses, geoCache: {} }}
        mode={mode}
        readOnly={true}
      />
    </div>
  );
}