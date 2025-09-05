// src/app/tree/[id]/tree-client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./widgets/LeafletMap'), { ssr: false });
const CircularTree = dynamic(() => import('./widgets/CircularTree'), { ssr: false });
const HierarchyTree = dynamic(() => import('./widgets/HierarchyTree'), { ssr: false });

type Sex = 'M' | 'F' | 'U';
type Person = {
  id: string;
  name?: string;
  sex?: Sex;
  birthDate?: string;     // YYYY-MM-DD
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residencePlace?: string;
};

type Link = { parentId: string; childId: string };
type SpouseLink = { a: string; b: string };

type GeoPoint = { label: string; lat: number; lon: number };

type State = {
  people: Person[];
  links: Link[];
  spouses: SpouseLink[];
  // cache place -> coords (to avoid repeated lookups)
  geoCache: Record<string, { lat: number; lon: number }>;
};

function uid(len = 10) {
  const abc = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < len; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

async function fetchPlaces(q: string): Promise<GeoPoint[]> {
  if (!q || q.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j || []).map((it: any) => ({
    label: it.display_name,
    lat: parseFloat(it.lat),
    lon: parseFloat(it.lon),
  }));
}

export default function TreeClient({ treeId }: { treeId: string }) {
  const [tab, setTab] = useState<'overview' | 'tree' | 'map' | 'circular' | 'hierarchy' | 'settings'>('overview');

  const [state, setState] = useState<State>(() => {
    const k = `gg:tree:${treeId}`;
    const s = typeof window !== 'undefined' ? window.localStorage.getItem(k) : null;
    return s ? (JSON.parse(s) as State) : { people: [], links: [], spouses: [], geoCache: {} };
  });

  const saveLocal = (s: State) => {
    setState(s);
    if (typeof window !== 'undefined') window.localStorage.setItem(`gg:tree:${treeId}`, JSON.stringify(s));
  };

  // quick add person
  const [quickName, setQuickName] = useState('');
  function quickAddPerson() {
    const name = quickName.trim();
    if (!name) return;
    const p: Person = { id: uid(), name };
    const next = structuredClone(state);
    next.people.push(p);
    saveLocal(next);
    setQuickName('');
  }

  // place autocomplete helpers (shared input experience)
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeOpts, setPlaceOpts] = useState<GeoPoint[]>([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const opts = await fetchPlaces(placeQuery);
      setPlaceOpts(opts);
    }, 250);
    return () => clearTimeout(t);
  }, [placeQuery]);

  // Map points from people + cached geocodes
  const mapPoints: GeoPoint[] = useMemo(() => {
    const uniq: Record<string, GeoPoint> = {};
    const add = (label?: string) => {
      if (!label) return;
      const c = state.geoCache[label];
      if (c) uniq[label] = { label, lat: c.lat, lon: c.lon };
    };
    for (const p of state.people) {
      add(p.birthPlace);
      add(p.deathPlace);
      add(p.residencePlace);
    }
    return Object.values(uniq);
  }, [state]);

  // —— person field updates ——
  function updatePerson<K extends keyof Person>(id: string, key: K, value: Person[K]) {
    const next = structuredClone(state);
    const target = next.people.find((x) => x.id === id);
    if (!target) return;
    (target as any)[key] = value;
    saveLocal(next);
  }

  async function setPlaceWithGeocode(id: string, field: 'birthPlace' | 'deathPlace' | 'residencePlace', label: string) {
    const next = structuredClone(state);
    const target = next.people.find((x) => x.id === id);
    if (!target) return;
    target[field] = label;

    if (!next.geoCache[label]) {
      const opts = await fetchPlaces(label);
      if (opts.length) next.geoCache[label] = { lat: opts[0].lat, lon: opts[0].lon };
    }
    saveLocal(next);
  }

  // —— linking (parent-child, spouses) ——
  function linkParentChild(parentId: string, childId: string) {
    if (!parentId || !childId || parentId === childId) return;
    const next = structuredClone(state);
    if (!next.links.find((l) => l.parentId === parentId && l.childId === childId)) {
      next.links.push({ parentId, childId });
      saveLocal(next);
    }
  }

  function linkSpouses(a: string, b: string) {
    if (!a || !b || a === b) return;
    const next = structuredClone(state);
    if (!next.spouses.find((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a))) {
      next.spouses.push({ a, b });
      saveLocal(next);
    }
  }

  function removePerson(id: string) {
    const next = structuredClone(state);
    next.people = next.people.filter((p) => p.id !== id);
    next.links = next.links.filter((l) => l.parentId !== id && l.childId !== id);
    next.spouses = next.spouses.filter((s) => s.a !== id && s.b !== id);
    saveLocal(next);
  }

  // —— export/import/publish ——
  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tree-${treeId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function publishSnapshot(mode: 'byo' | 'managed' = 'byo') {
    try {
      const r = await fetch('/api/storage/snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ treeId, json: state, provider: 'web3storage', mode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to publish');
      alert(`Published!\nCID: ${j.cid}\nBytes: ${j.bytes}`);
    } catch (e: any) {
      alert(e?.message || 'Failed');
    }
  }

  // simple counters
  const counts = useMemo(() => {
    const people = state.people.length;
    const families = state.spouses.length;
    const links = state.links.length;
    return { people, families, links };
  }, [state]);

  // UI primitives
  const TabButton = ({ id, children }: { id: typeof tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-1 rounded-md border text-sm ${
        tab === id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className={`border rounded px-2 py-1 text-sm w-full ${props.className || ''}`}
    />
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <TabButton id="overview">Overview</TabButton>
        <TabButton id="tree">Tree</TabButton>
        <TabButton id="map">Map</TabButton>
        <TabButton id="circular">Circular</TabButton>
        <TabButton id="hierarchy">Hierarchy</TabButton>
        <TabButton id="settings">Settings</TabButton>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-slate-500">People</div>
            <div className="text-2xl font-semibold">{counts.people}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-slate-500">Parent/Child Links</div>
            <div className="text-2xl font-semibold">{counts.links}</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-slate-500">Spouse Links</div>
            <div className="text-2xl font-semibold">{counts.families}</div>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button onClick={exportJson} className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Export JSON</button>
            <button onClick={() => publishSnapshot('byo')} className="px-3 py-2 rounded border text-sm">Publish Snapshot (BYO)</button>
            <button onClick={() => publishSnapshot('managed')} className="px-3 py-2 rounded border text-sm">Publish Snapshot (Managed)</button>
          </div>
        </div>
      )}

      {/* Tree editor (table) */}
      {tab === 'tree' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Quick add person (name)" value={quickName} onChange={(e) => setQuickName(e.target.value)} />
            <button onClick={quickAddPerson} className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Add</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border rounded">
              <thead className="bg-slate-50 text-left text-sm">
                <tr>
                  <th className="p-2 border-b">Name</th>
                  <th className="p-2 border-b">Sex</th>
                  <th className="p-2 border-b">Birth</th>
                  <th className="p-2 border-b">Birth Place</th>
                  <th className="p-2 border-b">Death</th>
                  <th className="p-2 border-b">Death Place</th>
                  <th className="p-2 border-b">Residence</th>
                  <th className="p-2 border-b">Link</th>
                  <th className="p-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.people.map((p) => (
                  <tr key={p.id} className="text-sm">
                    <td className="p-2 border-b">
                      <Input value={p.name || ''} onChange={(e) => updatePerson(p.id, 'name', e.target.value)} />
                    </td>
                    <td className="p-2 border-b">
                      <select
                        value={p.sex || 'U'}
                        onChange={(e) => updatePerson(p.id, 'sex', e.target.value as Sex)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="U">—</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    <td className="p-2 border-b">
                      <Input
                        type="date"
                        value={p.birthDate || ''}
                        onChange={(e) => updatePerson(p.id, 'birthDate', e.target.value || undefined)}
                      />
                    </td>
                    <td className="p-2 border-b">
                      <div className="relative">
                        <Input
                          placeholder="Search place…"
                          value={p.birthPlace || ''}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            updatePerson(p.id, 'birthPlace', e.target.value || undefined);
                          }}
                          onBlur={async (e) => {
                            const label = e.currentTarget.value.trim();
                            if (label) await setPlaceWithGeocode(p.id, 'birthPlace', label);
                          }}
                        />
                        {/* simple dropdown */}
                        {placeQuery && placeOpts.length > 0 && (
                          <div className="absolute z-10 mt-1 bg-white border rounded shadow max-h-40 overflow-auto w-full">
                            {placeOpts.map((opt) => (
                              <div
                                key={opt.label}
                                onMouseDown={async () => {
                                  setPlaceQuery('');
                                  await setPlaceWithGeocode(p.id, 'birthPlace', opt.label);
                                }}
                                className="px-2 py-1 hover:bg-slate-100 cursor-pointer text-sm"
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border-b">
                      <Input
                        type="date"
                        value={p.deathDate || ''}
                        onChange={(e) => updatePerson(p.id, 'deathDate', e.target.value || undefined)}
                      />
                    </td>
                    <td className="p-2 border-b">
                      <div className="relative">
                        <Input
                          placeholder="Search place…"
                          value={p.deathPlace || ''}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            updatePerson(p.id, 'deathPlace', e.target.value || undefined);
                          }}
                          onBlur={async (e) => {
                            const label = e.currentTarget.value.trim();
                            if (label) await setPlaceWithGeocode(p.id, 'deathPlace', label);
                          }}
                        />
                        {placeQuery && placeOpts.length > 0 && (
                          <div className="absolute z-10 mt-1 bg-white border rounded shadow max-h-40 overflow-auto w-full">
                            {placeOpts.map((opt) => (
                              <div
                                key={opt.label}
                                onMouseDown={async () => {
                                  setPlaceQuery('');
                                  await setPlaceWithGeocode(p.id, 'deathPlace', opt.label);
                                }}
                                className="px-2 py-1 hover:bg-slate-100 cursor-pointer text-sm"
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border-b">
                      <div className="relative">
                        <Input
                          placeholder="Search place…"
                          value={p.residencePlace || ''}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            updatePerson(p.id, 'residencePlace', e.target.value || undefined);
                          }}
                          onBlur={async (e) => {
                            const label = e.currentTarget.value.trim();
                            if (label) await setPlaceWithGeocode(p.id, 'residencePlace', label);
                          }}
                        />
                        {placeQuery && placeOpts.length > 0 && (
                          <div className="absolute z-10 mt-1 bg-white border rounded shadow max-h-40 overflow-auto w-full">
                            {placeOpts.map((opt) => (
                              <div
                                key={opt.label}
                                onMouseDown={async () => {
                                  setPlaceQuery('');
                                  await setPlaceWithGeocode(p.id, 'residencePlace', opt.label);
                                }}
                                className="px-2 py-1 hover:bg-slate-100 cursor-pointer text-sm"
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border-b">
                      <div className="flex gap-1">
                        {/* quick link UI: parent/child via selects */}
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          onChange={(e) => linkParentChild(p.id, e.target.value)}
                        >
                          <option value="">Child…</option>
                          {state.people
                            .filter((q) => q.id !== p.id)
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.name || q.id.slice(0, 6)}
                              </option>
                            ))}
                        </select>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          onChange={(e) => linkParentChild(e.target.value, p.id)}
                        >
                          <option value="">Parent…</option>
                          {state.people
                            .filter((q) => q.id !== p.id)
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.name || q.id.slice(0, 6)}
                              </option>
                            ))}
                        </select>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          onChange={(e) => linkSpouses(p.id, e.target.value)}
                        >
                          <option value="">Spouse…</option>
                          {state.people
                            .filter((q) => q.id !== p.id)
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.name || q.id.slice(0, 6)}
                              </option>
                            ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-2 border-b">
                      <button onClick={() => removePerson(p.id)} className="px-2 py-1 text-xs rounded border">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {state.people.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-slate-500">
                      No people yet — add your first person above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Map */}
      {tab === 'map' && (
        <div>
          <LeafletMap points={mapPoints} />
        </div>
      )}

      {/* Circular / Hierarchy */}
      {tab === 'circular' && (
        <div className="overflow-auto">
          <CircularTree people={state.people} links={state.links} />
        </div>
      )}
      {tab === 'hierarchy' && (
        <div className="overflow-auto">
          <HierarchyTree people={state.people} links={state.links} />
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <div className="font-medium mb-2">Import JSON</div>
            <input
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const text = await f.text();
                try {
                  const parsed = JSON.parse(text) as State;
                  if (!parsed || !Array.isArray(parsed.people)) throw new Error('Invalid format');
                  saveLocal(parsed);
                } catch (err: any) {
                  alert(err?.message || 'Import failed');
                }
              }}
            />
          </div>
          <div className="p-4 border rounded">
            <div className="font-medium mb-2">Danger zone</div>
            <button
              className="px-3 py-2 rounded border text-sm"
              onClick={() => {
                if (!confirm('Clear local data for this tree?')) return;
                const empty: State = { people: [], links: [], spouses: [], geoCache: {} };
                saveLocal(empty);
              }}
            >
              Clear local data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
