// src/app/tree/[id]/tree-client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import FamilyTreeGraph from '@/components/FamilyTreeGraph';
import MembersClient from './members-client';

type Person = {
  id: string;
  name?: string;
  sex?: 'M' | 'F' | 'U';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residencePlace?: string;
};

export type State = {
  people: Person[];
  links: { parentId: string; childId: string }[];
  spouses: [string, string][];
  geoCache: Record<string, { lat: number; lon: number }>;
};

// Lazy widgets (no SSR)
const LeafletMap = dynamic(() => import('./widgets/LeafletMap'), { ssr: false });

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function placeKey(q: string) {
  return (q || '').trim().toLowerCase();
}
function toISODate(value?: string) {
  if (!value) return '';
  const v = String(value).trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    let mm = m[1],
      dd = m[2],
      yyyy = m[3];
    if (parseInt(dd, 10) > 12) [dd, mm] = [mm, dd];
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${yyyy}-${pad(parseInt(mm))}-${pad(parseInt(dd))}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  return '';
}

export type TreeClientProps = {
  treeId: string;
  initialState?: State;
  readOnly?: boolean;
};

export default function TreeClient({ treeId, initialState, readOnly = false }: TreeClientProps) {
  const [tab, setTab] = useState<'overview' | 'tree' | 'map' | 'settings'>('overview');

  // State for tree view interactions
  const [treeViewMode, setTreeViewMode] = useState<'radial' | 'vertical'>('radial');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [spouseName, setSpouseName] = useState('');

  // Local state: load/save per-tree
  const [state, setState] = useState<State>(() => {
    if (initialState) return structuredClone(initialState);
    const k = `gg:tree:${treeId}`;
    const s = typeof window !== 'undefined' ? window.localStorage.getItem(k) : null;
    return s ? (JSON.parse(s) as State) : { people: [], links: [], spouses: [], geoCache: {} };
  });
  const saveLocal = (s: State) => {
    if (readOnly) return;
    setState(s);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`gg:tree:${treeId}`, JSON.stringify(s));
    }
  };

  // Quick add
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

  /** Add a child to the currently selected person (in tree view). */
  function addChild() {
    if (!selectedId) return;
    const name = childName.trim();
    if (!name) return;
    const child: Person = { id: uid(), name };
    const next = structuredClone(state);
    next.people.push(child);
    next.links.push({ parentId: selectedId, childId: child.id });
    saveLocal(next);
    setChildName('');
  }

  /** Add a spouse to the currently selected person (in tree view). */
  function addSpouse() {
    if (!selectedId) return;
    const name = spouseName.trim();
    if (!name) return;
    const spouse: Person = { id: uid(), name };
    const next = structuredClone(state);
    next.people.push(spouse);
    next.spouses.push([selectedId, spouse.id]);
    saveLocal(next);
    setSpouseName('');
  }

  // Place inputs autocomplete support
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Array<{ label: string; lat: number; lon: number }>>([]);
  const [placeLoading, setPlaceLoading] = useState(false);

  // Debounced place lookup
  useEffect(() => {
    const q = placeQuery.trim();
    if (!q) {
      setPlaceResults([]);
      return;
    }

    setPlaceLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) throw new Error('Place search failed');
        const j = await r.json();
        const arr = Array.isArray(j?.results) ? j.results : [];
        // Normalize to {label,lat,lon}
        const norm = arr
          .map((it: any) => ({
            label: it?.label || it?.display_name || it?.name || '',
            lat: Number(it?.lat),
            lon: Number(it?.lon),
          }))
          .filter((it: any) => it.label && isFinite(it.lat) && isFinite(it.lon));
        setPlaceResults(norm);
      } catch {
        setPlaceResults([]);
      } finally {
        setPlaceLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [placeQuery]);

  // Options for datalist
  const placeOpts = placeResults;

  // Map points: birth/residence/death with cached geocodes
  const [filters, setFilters] = useState({ birth: true, residence: true, death: true });
  const points = useMemo(() => {
    const pts: { lat: number; lon: number; label: string; type: 'birth' | 'residence' | 'death' }[] = [];
    for (const p of state.people) {
      const push = (place: string | undefined, type: 'birth' | 'residence' | 'death') => {
        if (!place) return;
        const key = placeKey(place);
        const g = state.geoCache[key];
        if (g) pts.push({ lat: g.lat, lon: g.lon, label: `${p.name || 'Unknown'} — ${place}`, type });
      };
      push(p.birthPlace, 'birth');
      push(p.residencePlace, 'residence');
      push(p.deathPlace, 'death');
    }
    return pts.filter((pt) => filters[pt.type]);
  }, [state, filters]);

  // Snapshot publishing controls
  const [mode, setMode] = useState<'byo' | 'managed'>('byo');
  const [byoToken, setByoToken] = useState('');
  const [pubStatus, setPubStatus] = useState<string>('');

  async function publish() {
    try {
      setPubStatus('Publishing…');
      const body: any = { treeId, mode, json: state };
      if (mode === 'byo') body.byoToken = byoToken || undefined;

      const r = await fetch('/api/storage/snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPubStatus(j?.error || 'Failed');
        return;
      }
      const kb = j?.bytes ? ` (${Math.ceil(j.bytes / 1024)} KB)` : '';
      setPubStatus(`Published CID: ${j?.cid ?? 'unknown'}${kb}`);
    } catch (e: any) {
      setPubStatus(e?.message || 'Failed');
    }
  }

  const peopleList = useMemo(() => state.people, [state.people]);

  const tabs = readOnly
    ? (['overview', 'tree', 'map'] as const)
    : (['overview', 'tree', 'map', 'settings'] as const);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card space-y-4">
          {!readOnly && (
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a person by name…"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    quickAddPerson();
                  }
                }}
              />
              <button className="btn" onClick={quickAddPerson}>
                Add
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th>Sex</th>
                  <th>Birth</th>
                  <th>Death</th>
                  <th>Residence</th>
                </tr>
              </thead>
              <tbody>
                {peopleList.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">
                      <input
                        className="input w-full"
                        disabled={readOnly}
                        value={p.name || ''}
                        onChange={(e) => {
                          const n = structuredClone(state);
                          const q = n.people.find((x) => x.id === p.id)!;
                          q.name = e.target.value;
                          saveLocal(n);
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        disabled={readOnly}
                        value={p.sex || 'U'}
                        onChange={(e) => {
                          const n = structuredClone(state);
                          const q = n.people.find((x) => x.id === p.id)!;
                          q.sex = e.target.value as any;
                          saveLocal(n);
                        }}
                      >
                        <option value="U">—</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="input"
                          disabled={readOnly}
                          value={p.birthDate || ''}
                          onChange={(e) => {
                            const n = structuredClone(state);
                            const q = n.people.find((x) => x.id === p.id)!;
                            const iso = toISODate(e.target.value);
                            if (iso) q.birthDate = iso;
                            else delete q.birthDate;
                            saveLocal(n);
                          }}
                        />
                        <input
                          className="input place-input"
                          disabled={readOnly}
                          placeholder="Birth place"
                          list={'dl-' + p.id + '-birth'}
                          value={p.birthPlace || ''}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            const n = structuredClone(state);
                            const q = n.people.find((x) => x.id === p.id)!;
                            q.birthPlace = e.target.value;
                            saveLocal(n);
                          }}
                          onBlur={(e) => {
                            const opt = placeOpts.find((o) => o.label === e.target.value);
                            if (opt) {
                              const n = structuredClone(state);
                              n.geoCache[placeKey(opt.label)] = {
                                lat: opt.lat,
                                lon: opt.lon,
                              };
                              saveLocal(n);
                            }
                          }}
                        />
                        <datalist id={'dl-' + p.id + '-birth'}>
                          {placeOpts.map((o) => (
                            <option key={o.label} value={o.label} />
                          ))}
                        </datalist>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="input"
                          disabled={readOnly}
                          value={p.deathDate || ''}
                          onChange={(e) => {
                            const n = structuredClone(state);
                            const q = n.people.find((x) => x.id === p.id)!;
                            const iso = toISODate(e.target.value);
                            if (iso) q.deathDate = iso;
                            else delete q.deathDate;
                            saveLocal(n);
                          }}
                        />
                        <input
                          className="input place-input"
                          disabled={readOnly}
                          placeholder="Death place"
                          list={'dl-' + p.id + '-death'}
                          value={p.deathPlace || ''}
                          onChange={(e) => {
                            setPlaceQuery(e.target.value);
                            const n = structuredClone(state);
                            const q = n.people.find((x) => x.id === p.id)!;
                            q.deathPlace = e.target.value;
                            saveLocal(n);
                          }}
                          onBlur={(e) => {
                            const opt = placeOpts.find((o) => o.label === e.target.value);
                            if (opt) {
                              const n = structuredClone(state);
                              n.geoCache[placeKey(opt.label)] = {
                                lat: opt.lat,
                                lon: opt.lon,
                              };
                              saveLocal(n);
                            }
                          }}
                        />
                        <datalist id={'dl-' + p.id + '-death'}>
                          {placeOpts.map((o) => (
                            <option key={o.label} value={o.label} />
                          ))}
                        </datalist>
                      </div>
                    </td>
                    <td>
                      <input
                        className="input place-input w-56"
                        disabled={readOnly}
                        placeholder="Residence"
                        list={'dl-' + p.id + '-res'}
                        value={p.residencePlace || ''}
                        onChange={(e) => {
                          setPlaceQuery(e.target.value);
                          const n = structuredClone(state);
                          const q = n.people.find((x) => x.id === p.id)!;
                          q.residencePlace = e.target.value;
                          saveLocal(n);
                        }}
                        onBlur={(e) => {
                          const opt = placeOpts.find((o) => o.label === e.target.value);
                          if (opt) {
                            const n = structuredClone(state);
                            n.geoCache[placeKey(opt.label)] = {
                              lat: opt.lat,
                              lon: opt.lon,
                            };
                            saveLocal(n);
                          }
                        }}
                      />
                      <datalist id={'dl-' + p.id + '-res'}>
                        {placeOpts.map((o) => (
                          <option key={o.label} value={o.label} />
                        ))}
                      </datalist>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'tree' && (
        <div className="card space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-2">
            <button
              className={`tab ${treeViewMode === 'radial' ? 'active' : ''}`}
              onClick={() => setTreeViewMode('radial')}
            >
              Circular
            </button>
            <button
              className={`tab ${treeViewMode === 'vertical' ? 'active' : ''}`}
              onClick={() => setTreeViewMode('vertical')}
            >
              Hierarchy
            </button>
          </div>
          <FamilyTreeGraph
            state={state}
            mode={treeViewMode === 'radial' ? 'radial' : 'vertical'}
            selectedId={selectedId ?? undefined}
            onSelect={(id) => setSelectedId(id)}
            readOnly={readOnly}
          />
          {!readOnly && (
            <div className="space-y-2">
              <div className="text-sm text-slate-500">
                {selectedId
                  ? `Selected: ${state.people.find((p) => p.id === selectedId)?.name || selectedId}`
                  : 'Select a person to add relatives'}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex gap-2 flex-1">
                  <input
                    className="input flex-1"
                    placeholder="New child name…"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    disabled={!selectedId}
                  />
                  <button className="btn" onClick={addChild} disabled={!selectedId}>
                    Add Child
                  </button>
                </div>
                <div className="flex gap-2 flex-1">
                  <input
                    className="input flex-1"
                    placeholder="New spouse name…"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    disabled={!selectedId}
                  />
                  <button className="btn" onClick={addSpouse} disabled={!selectedId}>
                    Add Spouse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'map' && (
        <div className="card space-y-2">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.birth}
                onChange={() => setFilters((f) => ({ ...f, birth: !f.birth }))}
              />
              Birth
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.residence}
                onChange={() => setFilters((f) => ({ ...f, residence: !f.residence }))}
              />
              Residence
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.death}
                onChange={() => setFilters((f) => ({ ...f, death: !f.death }))}
              />
              Death
            </label>
          </div>
          <LeafletMap points={points} />
        </div>
      )}

      {!readOnly && tab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-2">
            <div className="text-sm font-semibold">Publish Snapshot</div>
            <div className="flex gap-2">
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
                <option value="byo">BYO Token</option>
                <option value="managed">Managed</option>
              </select>
            </div>
            {mode === 'byo' && (
              <input
                className="input w-full"
                placeholder="Your token"
                value={byoToken}
                onChange={(e) => setByoToken(e.target.value)}
              />
            )}
            <button className="btn" onClick={publish}>
              Publish
            </button>
            {pubStatus && <div className="text-xs text-slate-600">{pubStatus}</div>}
          </div>

          <div className="card">
            <MembersClient treeId={treeId} />
          </div>
        </div>
      )}
    </div>
  );
}
