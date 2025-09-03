'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

type Person = {
  id: string;
  name?: string;
  sex?: 'M'|'F'|'U';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residencePlace?: string;
};

type State = {
  people: Person[];
  links: { parentId: string; childId: string }[];
  spouses: [string, string][];
  geoCache: Record<string,{lat:number,lon:number}>;
};

const LeafletMap = dynamic(() => import('./widgets/LeafletMap'), { ssr: false });

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function placeKey(q:string){ return (q||'').trim().toLowerCase(); }
function toISODate(value?: string) {
  if (!value) return '';
  const v = String(value).trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) {
    let mm = m[1], dd = m[2], yyyy = m[3];
    if (parseInt(dd,10) > 12) [dd, mm] = [mm, dd];
    const pad = (n:number)=> n.toString().padStart(2,'0');
    return `${yyyy}-${pad(parseInt(mm))}-${pad(parseInt(dd))}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) {
    const pad = (n:number)=> n.toString().padStart(2,'0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  }
  return '';
}

async function fetchPlaces(q: string) {
  if (!q || q.trim().length < 3) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { 'accept':'application/json' } });
  if (!r.ok) return [];
  const j = await r.json();
  return (j||[]).map((it:any)=>({ label: it.display_name, lat: parseFloat(it.lat), lon: parseFloat(it.lon) }));
}

export default function TreeClient({ treeId }: { treeId: string }) {
  const [tab, setTab] = useState<'overview'|'tree'|'map'|'settings'>('overview');
  const [state, setState] = useState<State>(() => {
    const k = `gg:tree:${treeId}`;
    const s = (typeof window !== 'undefined') ? window.localStorage.getItem(k) : null;
    return s ? JSON.parse(s) : { people: [], links: [], spouses: [], geoCache: {} };
  });
  const saveLocal = (s: State) => {
    setState(s);
    if (typeof window !== 'undefined') localStorage.setItem(`gg:tree:${treeId}`, JSON.stringify(s));
  };

  // quick add
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

  // place inputs autocomplete support
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeOpts, setPlaceOpts] = useState<{label:string,lat:number,lon:number}[]>([]);
  useEffect(()=>{
    const t = setTimeout(async ()=>{
      setPlaceOpts(await fetchPlaces(placeQuery));
    }, 300);
    return ()=> clearTimeout(t);
  }, [placeQuery]);

  // publish snapshot (BYO or managed)
  const [provider, setProvider] = useState<'web3storage'|'storacha'>('web3storage');
  const [mode, setMode] = useState<'byo'|'managed'>('byo');
  const [byoToken, setByoToken] = useState('');
  const [pubStatus, setPubStatus] = useState<string | null>(null);

  async function publish() {
    setPubStatus('Publishing…');
    const body = { treeId, provider, mode, byoToken: mode==='byo'?byoToken:undefined, json: state };
    const r = await fetch('/api/storage/snapshot', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body)});
    const j = await r.json();
    if (!r.ok) { setPubStatus(j.error || 'Failed'); return; }
    setPubStatus(`Published CID: ${j.cid} (${Math.ceil(j.bytes/1024)} KB)`);
  }

  const peopleList = useMemo(()=>state.people, [state.people]);

  const points = useMemo(()=>{
    const pts: {lat:number, lon:number, label:string}[] = [];
    for (const p of state.people) {
      const places = [p.birthPlace, p.residencePlace, p.deathPlace].filter(Boolean) as string[];
      for (const pl of places) {
        const key = placeKey(pl);
        const g = state.geoCache[key];
        if (g) pts.push({ lat: g.lat, lon: g.lon, label: `${p.name || 'Unknown'} — ${pl}` });
      }
    }
    return pts;
  }, [state]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['overview','tree','map','settings'] as const).map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="card space-y-4">
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Add a person by name…" value={quickName} onChange={e=>setQuickName(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') { e.preventDefault(); quickAddPerson(); } }} />
            <button className="btn" onClick={quickAddPerson}>Add</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500">
                <th className="py-2">Name</th><th>Sex</th><th>Birth</th><th>Death</th><th>Residence</th>
              </tr></thead>
              <tbody>
                {peopleList.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">
                      <input className="input w-full" value={p.name || ''} onChange={e=>{ const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; q.name=e.target.value; saveLocal(n); }} />
                    </td>
                    <td>
                      <select className="input" value={p.sex || 'U'} onChange={e=>{ const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; q.sex=e.target.value as any; saveLocal(n); }}>
                        <option value="U">—</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <input type="date" className="input" value={p.birthDate || ''} onChange={e=>{ const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; const iso=toISODate(e.target.value); if(iso) q.birthDate=iso; else delete q.birthDate; saveLocal(n); }} />
                        <input className="input place-input" placeholder="Birth place" list={"dl-"+p.id+"-birth"} value={p.birthPlace||''} onChange={e=>{ setPlaceQuery(e.target.value); const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; q.birthPlace=e.target.value; saveLocal(n); }} onBlur={e=>{
                          const opt = placeOpts.find(o=>o.label===e.target.value);
                          if (opt) {
                            const n=structuredClone(state); n.geoCache[placeKey(opt.label)] = { lat: opt.lat, lon: opt.lon }; saveLocal(n);
                          }
                        }} />
                        <datalist id={"dl-"+p.id+"-birth"}>
                          {placeOpts.map(o=> <option key={o.label} value={o.label} />)}
                        </datalist>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <input type="date" className="input" value={p.deathDate || ''} onChange={e=>{ const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; const iso=toISODate(e.target.value); if(iso) q.deathDate=iso; else delete q.deathDate; saveLocal(n); }} />
                        <input className="input place-input" placeholder="Death place" list={"dl-"+p.id+"-death"} value={p.deathPlace||''} onChange={e=>{ setPlaceQuery(e.target.value); const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; q.deathPlace=e.target.value; saveLocal(n); }} onBlur={e=>{
                          const opt = placeOpts.find(o=>o.label===e.target.value);
                          if (opt) {
                            const n=structuredClone(state); n.geoCache[placeKey(opt.label)] = { lat: opt.lat, lon: opt.lon }; saveLocal(n);
                          }
                        }} />
                        <datalist id={"dl-"+p.id+"-death"}>
                          {placeOpts.map(o=> <option key={o.label} value={o.label} />)}
                        </datalist>
                      </div>
                    </td>
                    <td>
                      <input className="input place-input w-56" placeholder="Residence" list={"dl-"+p.id+"-res"} value={p.residencePlace||''} onChange={e=>{ setPlaceQuery(e.target.value); const n=structuredClone(state); const q=n.people.find(x=>x.id===p.id)!; q.residencePlace=e.target.value; saveLocal(n); }} onBlur={e=>{
                        const opt = placeOpts.find(o=>o.label===e.target.value);
                        if (opt) {
                          const n=structuredClone(state); n.geoCache[placeKey(opt.label)] = { lat: opt.lat, lon: opt.lon }; saveLocal(n);
                        }
                      }} />
                      <datalist id={"dl-"+p.id+"-res"}>
                        {placeOpts.map(o=> <option key={o.label} value={o.label} />)}
                      </datalist>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='tree' && (
        <div className="card">
          <div className="text-sm text-slate-600 mb-2">Graph view (simple)</div>
          <ul className="list-disc pl-6 text-sm">
            {peopleList.map(p => <li key={p.id}>{p.name || '—'}</li>)}
          </ul>
        </div>
      )}

      {tab==='map' && (
        <div className="card">
          <LeafletMap points={points} />
        </div>
      )}

      {tab==='settings' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-2">
            <div className="text-sm font-semibold">Publish Snapshot</div>
            <div className="flex gap-2">
              <select className="input" value={provider} onChange={e=>setProvider(e.target.value as any)}>
                <option value="web3storage">Web3.Storage</option>
              </select>
              <select className="input" value={mode} onChange={e=>setMode(e.target.value as any)}>
                <option value="byo">BYO Token</option>
                <option value="managed">Managed</option>
              </select>
            </div>
            {mode==='byo' && (
              <input className="input w-full" placeholder="Your Web3.Storage token" value={byoToken} onChange={e=>setByoToken(e.target.value)} />
            )}
            <button className="btn" onClick={publish}>Publish</button>
            {pubStatus && <div className="text-xs text-slate-600">{pubStatus}</div>}
          </div>

          <div className="card">
            <Members treeId={treeId} />
          </div>
        </div>
      )}
    </div>
  );
}

function Members({ treeId }: { treeId: string }) {
  const [rows, setRows] = useState<{id:string,email:string,role:string}[]|null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin'|'editor'|'viewer'>('editor');
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    const r = await fetch(`/api/trees/${treeId}/members`);
    const j = await r.json();
    setRows(j);
  }
  useEffect(()=>{ load(); }, [treeId]);

  async function add() {
    setErr(null);
    const r = await fetch(`/api/trees/${treeId}/members`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email, role }) });
    if (!r.ok) { const j=await r.json(); setErr(j.error || 'Failed'); return; }
    setEmail(''); load();
  }

  async function remove(userId: string) {
    await fetch(`/api/trees/${treeId}/members?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Members</div>
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="invite@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
        <select className="input" value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn" onClick={add}>Add</button>
      </div>
      {err && <div className="text-rose-600 text-sm">{err}</div>}
      <div className="mt-2 divide-y">
        {rows?.map(r => (
          <div key={r.id} className="py-2 flex items-center">
            <div className="flex-1">{r.email}</div>
            <div className="badge mr-2">{r.role}</div>
            <button className="text-rose-600 text-sm" onClick={()=>remove(r.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
