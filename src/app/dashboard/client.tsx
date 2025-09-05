"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Users } from "lucide-react";

type Role = "owner" | "admin" | "editor" | "viewer";

type Person = {
  id: string; name: string; sex?: "M"|"F";
  birthDate?: string; deathDate?: string;
  birthPlace?: string; deathPlace?: string;
  lat?: number; lon?: number;
  spouseIds?: string[]; parentIds?: string[]; childIds?: string[];
  notes?: string;
};
type Tree = { id: string; name: string; createdAt: number; members: Record<string,Role>; people: Record<string,Person> };

export default function Client() {
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [newTree, setNewTree] = useState("");

  async function startAuth() {
    const r = await fetch("/api/auth/start", { method: "POST", body: JSON.stringify({ email })});
    if (r.ok) setOtpSent(true);
  }
  async function verify() {
    const r = await fetch("/api/auth/verify", { method: "POST", body: JSON.stringify({ email, code })});
    if (r.ok) { setAuthed(true); loadTrees(); }
  }
  async function loadTrees() {
    const r = await fetch("/api/families/mine");
    if (!r.ok) return;
    const js = await r.json();
    setTrees(js.trees as Tree[]);
  }
  async function createTree() {
    const r = await fetch("/api/families/create", { method: "POST", body: JSON.stringify({ name: newTree }) });
    if (r.ok) { setNewTree(""); loadTrees(); }
  }

  useEffect(() => { loadTrees(); }, []);

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold mb-3">Sign in with Email (OTP)</h2>
        {!authed ? (
          <div className="flex flex-col gap-2 md:flex-row">
            <input className="input w-full" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
            {!otpSent ? (
              <button className="btn" onClick={startAuth}>Send Code</button>
            ) : (
              <>
                <input className="input w-full" placeholder="6-digit code" value={code} onChange={e=>setCode(e.target.value)} />
                <button className="btn" onClick={verify}><Check className="w-4 h-4 mr-1" /> Verify</button>
              </>
            )}
          </div>
        ) : <div className="text-green-700 font-medium">Signed in</div>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Your Trees</h3>
          <div className="flex gap-2">
            <input className="input" placeholder="New tree name..." value={newTree} onChange={e=>setNewTree(e.target.value)} />
            <button className="btn" onClick={createTree}><Plus className="w-4 h-4 mr-1" />Create</button>
          </div>
        </div>
        <hr className="my-3"/>
        <div className="grid md:grid-cols-2 gap-3">
          {trees.map(t => (
            <a key={t.id} href={`/tree/${t.id}`} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-600">Created {new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2 text-slate-600"><Users className="w-4 h-4"/>{Object.keys(t.members).length}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
