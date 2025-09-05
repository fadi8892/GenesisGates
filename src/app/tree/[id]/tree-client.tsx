"use client";

import { useEffect, useMemo, useState } from "react";
import LeafletMap from "./widgets/LeafletMap";

type Role = "owner"|"admin"|"editor"|"viewer";
type Person = {
  id: string; name: string; sex?: "M"|"F";
  birthDate?: string; deathDate?: string;
  birthPlace?: string; deathPlace?: string;
  lat?: number; lon?: number;
  spouseIds?: string[]; parentIds?: string[]; childIds?: string[];
  notes?: string;
};
type Tree = { id: string; name: string; createdAt: number; members: Record<string,Role>; people: Record<string,Person> };

export default function TreeClient({ treeId }: { treeId: string }) {
  const [tab, setTab] = useState<"overview"|"list"|"graph"|"map"|"settings"|"insights">("overview");
  const [tree, setTree] = useState<Tree | null>(null);
  const peopleList = useMemo(() => tree ? Object.values(tree.people) : [], [tree]);

  async function load() {
    const r = await fetch("/api/person/list", { method: "POST", body: JSON.stringify({ treeId }) });
    if (!r.ok) return;
    const js = await r.json();
    const t: Tree = { id: treeId, name: "Family", createdAt: Date.now(), members: {}, people: {} };
    js.people.forEach((p: Person) => t.people[p.id] = p);
    setTree(t);
  }
  useEffect(()=>{ load(); }, [treeId]);

  async function savePerson(p: Partial<Person>) {
    await fetch("/api/person/create", { method: "POST", body: JSON.stringify({ treeId, person: p }) });
    await load();
  }

  // Migration points & lines
  const points = useMemo(() => {
    const pts: {lat:number; lon:number; label:string}[] = [];
    peopleList.forEach(p => {
      if (typeof p.lat === "number" && typeof p.lon === "number") {
        pts.push({ lat: p.lat!, lon: p.lon!, label: p.name });
      }
    });
    return pts;
  }, [peopleList]);

  const lines = useMemo(() => {
    // naive: connect any person with multiple coords (birth->death) or parent->child if both geocoded
    const l: {lat:number; lon:number}[][] = [];
    peopleList.forEach(p => {
      if (p.lat && p.lon) {
        // parent-child edges
        (p.childIds || []).forEach(cid => {
          const c = peopleList.find(x => x.id === cid);
          if (c?.lat && c.lon) l.push([{lat:p.lat, lon:p.lon},{lat:c.lat, lon:c.lon}]);
        });
      }
    });
    return l;
  }, [peopleList]);

  // Insights
  const insights = useMemo(() => {
    const total = peopleList.length;
    const males = peopleList.filter(p => p.sex === "M").length;
    const females = peopleList.filter(p => p.sex === "F").length;
    const missingBirth = peopleList.filter(p => !p.birthDate && !p.birthPlace).length;
    const missingDeath = peopleList.filter(p => !p.deathDate && !p.deathPlace).length;

    // simple depth approximation (longest chain via parentIds)
    let maxDepth = 0;
    const cache = new Map<string, number>();
    function depth(pid: string): number {
      if (cache.has(pid)) return cache.get(pid)!;
      const p = peopleList.find(x => x.id === pid);
      if (!p || !p.parentIds || p.parentIds.length === 0) { cache.set(pid, 1); return 1; }
      const d = 1 + Math.max(...p.parentIds.map(depth));
      cache.set(pid, d); return d;
    }
    peopleList.forEach(p => { maxDepth = Math.max(maxDepth, depth(p.id)); });

    return { total, males, females, missingBirth, missingDeath, maxDepth };
  }, [peopleList]);

  // Minimal GEDCOM (client-side)
  function exportGed() {
    const lines: string[] = [];
    lines.push("0 HEAD"); lines.push("1 SOUR GenesisGates"); lines.push("1 CHAR UTF-8");
    peopleList.forEach(p => {
      lines.push(`0 @${p.id}@ INDI`);
      if (p.name) lines.push(`1 NAME ${p.name}`);
      if (p.sex) lines.push(`1 SEX ${p.sex}`);
      if (p.birthDate || p.birthPlace) { lines.push("1 BIRT"); if (p.birthDate) lines.push(`2 DATE ${p.birthDate}`); if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`); }
      if (p.deathDate || p.deathPlace) { lines.push("1 DEAT"); if (p.deathDate) lines.push(`2 DATE ${p.deathDate}`); if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`); }
    });
    lines.push("0 TRLR");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `genesisgates_${treeId}.ged`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importGed(file: File) {
    const txt = await file.text();
    const rows = txt.split(/\r?\n/);
    let cur: Partial<Person> | null = null;
    const batch: Partial<Person>[] = [];
    for (const r of rows) {
      const m = r.trim().match(/^(\d+)\s+(?:@([^@]+)@\s+)?([A-Z]+)(?:\s+(.*))?$/);
      if (!m) continue;
      const [, lvl, xref, tag, rest] = m;
      if (lvl === "0" && tag === "INDI") {
        if (cur?.name) batch.push(cur);
        cur = { id: xref || undefined, name: "" };
      } else if (cur) {
        if (lvl === "1" && tag === "NAME") cur.name = rest || "";
        if (lvl === "1" && tag === "SEX") cur.sex = (rest as any) === "M" ? "M" : (rest as any) === "F" ? "F" : undefined;
        if (lvl === "1" && (tag === "BIRT" || tag === "DEAT")) {
          // handled via lvl 2 below
        }
        if (lvl === "2" && tag === "DATE") {
          if (!cur.birthDate) cur.birthDate = rest;
          else cur.deathDate = rest;
        }
        if (lvl === "2" && tag === "PLAC") {
          if (!cur.birthPlace) cur.birthPlace = rest;
          else cur.deathPlace = rest;
        }
      }
    }
    if (cur?.name) batch.push(cur);
    for (const p of batch) await savePerson(p);
  }

  // Simple radial graph positions
  function GraphView({ people, links }: { people: Person[]; links: { parentId: string; childId: string }[] }) {
    const center = { x: 300, y: 300, r: 220 };
    const coords = useMemo(() => {
      const arr = people.map((p, i) => {
        const a = (i / Math.max(1, people.length)) * Math.PI * 2;
        return { id: p.id, x: center.x + Math.cos(a)*center.r, y: center.y + Math.sin(a)*center.r };
      });
      return Object.fromEntries(arr.map(a => [a.id, a]));
    }, [people.length]);

    return (
      <svg viewBox="0 0 600 600" className="w-full h-[520px] border rounded-xl bg-white">
        {links.map((l,i) => {
          const a = coords[l.parentId], b = coords[l.childId];
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#94a3b8" strokeWidth={1.5} />;
        })}
        {people.map(p => {
          const c = coords[p.id]; if (!c) return null;
          return (
            <g key={p.id}>
              <circle cx={c.x} cy={c.y} r={16} fill="#eef2ff" stroke="#6366f1"/>
              <text x={c.x} y={c.y+32} textAnchor="middle" fontSize="10">{p.name}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  const graphLinks = useMemo(() => {
    const res: {parentId:string; childId:string}[] = [];
    peopleList.forEach(p => (p.childIds||[]).forEach(cid => res.push({ parentId: p.id, childId: cid })));
    return res;
  }, [peopleList]);

  // UI
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tree: {tree?.name || "Loading..."}</h2>
          <div className="text-xs text-slate-600">ID: {treeId}</div>
        </div>
        <div className="flex items-center gap-2">
          {(["overview","list","graph","map","settings","insights"] as const).map(t => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {tab==="overview" && (
        <div className="card">
          <div className="text-sm text-slate-700">Welcome! Use the tabs above to edit, visualise, map migrations, import/export GEDCOM and see insights.</div>
        </div>
      )}

      {/* List + Quick edit */}
      {tab==="list" && (
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th>Name</th><th>Sex</th><th>Birth</th><th>Death</th><th>Place</th><th>Links</th></tr>
            </thead>
            <tbody>
              {peopleList.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="py-2">
                    <input className="input w-full" value={p.name} onChange={e=>savePerson({ id:p.id, name:e.target.value })}/>
                  </td>
                  <td className="py-2">
                    <select className="input" value={p.sex||""} onChange={e=>savePerson({ id:p.id, sex:(e.target.value||undefined) as any })}>
                      <option value=""></option><option value="M">M</option><option value="F">F</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <input className="input" placeholder="YYYY-MM-DD" value={p.birthDate||""} onChange={e=>savePerson({ id:p.id, birthDate:e.target.value })}/>
                  </td>
                  <td className="py-2">
                    <input className="input" placeholder="YYYY-MM-DD" value={p.deathDate||""} onChange={e=>savePerson({ id:p.id, deathDate:e.target.value })}/>
                  </td>
                  <td className="py-2">
                    <input className="input w-full" placeholder="City, Country" value={p.birthPlace||""} onChange={e=>savePerson({ id:p.id, birthPlace:e.target.value })}/>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      {/* quick linking by id (simple) */}
                      <input className="input w-28" placeholder="Add childId" onKeyDown={async ev=>{
                        if (ev.key!=="Enter") return;
                        const cid = (ev.target as HTMLInputElement).value.trim(); if (!cid) return;
                        const child = peopleList.find(x=>x.id===cid); if (!child) return;
                        await savePerson({ id:p.id, childIds:[...(p.childIds||[]), cid] });
                        await savePerson({ id:cid, parentIds:[...(child.parentIds||[]), p.id] });
                        (ev.target as HTMLInputElement).value="";
                      }}/>
                      <input className="input w-28" placeholder="Add spouseId" onKeyDown={async ev=>{
                        if (ev.key!=="Enter") return;
                        const sid = (ev.target as HTMLInputElement).value.trim(); if (!sid) return;
                        const sp = peopleList.find(x=>x.id===sid); if (!sp) return;
                        await savePerson({ id:p.id, spouseIds:[...(p.spouseIds||[]), sid] });
                        await savePerson({ id:sid, spouseIds:[...(sp.spouseIds||[]), p.id] });
                        (ev.target as HTMLInputElement).value="";
                      }}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="my-3"/>
          <div className="flex gap-2">
            <button className="btn" onClick={()=>savePerson({ name:"New Person" })}>+ Add Person</button>
          </div>
        </div>
      )}

      {/* Graph */}
      {tab==="graph" && (
        <div className="card">
          <GraphView people={peopleList} links={graphLinks}/>
        </div>
      )}

      {/* Map */}
      {tab==="map" && (
        <div className="card">
          <LeafletMap points={points} lines={lines}/>
        </div>
      )}

      {/* Settings: members + GEDCOM */}
      {tab==="settings" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-semibold mb-2">Members</div>
            <p className="text-sm text-slate-700 mb-2">Invite editors/viewers from dashboard in a future step. (API stub is present.)</p>
            <div className="text-xs text-slate-600">Tree ID: {treeId}</div>
          </div>

          <div className="card space-y-2">
            <div className="font-semibold">GEDCOM</div>
            <div className="flex gap-2">
              <button className="btn" onClick={exportGed}>Export .ged</button>
              <label className="btn cursor-pointer">
                Import .ged
                <input type="file" accept=".ged" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) importGed(f); }}/>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Insights (AI-lite) */}
      {tab==="insights" && (
        <div className="card space-y-2">
          <div className="text-sm font-semibold">Tree Insights</div>
          <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
            <li>Total people: {insights.total}</li>
            <li>Sex breakdown: {insights.males} ♂ / {insights.females} ♀</li>
            <li>Missing birth facts: {insights.missingBirth}</li>
            <li>Missing death facts: {insights.missingDeath}</li>
            <li>Max generation depth: {insights.maxDepth}</li>
          </ul>
          <p className="text-xs text-slate-500">More AI features (stories, fuzzy hints, OCR) can be added next.</p>
        </div>
      )}
    </div>
  );
}
