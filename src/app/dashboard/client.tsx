'use client';
import { useEffect, useMemo, useState } from 'react';

type Family = { id: string; treeKey: string; name: string; role: 'admin'|'editor'|'viewer'; createdAt: string };
type Person = { id: string; name: string; birthDate: string|null; deathDate: string|null; lat?: number|null; lon?: number|null; createdAt: string };

export default function DashboardClient({ email }: { email: string }) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  const [newFamilyName, setNewFamilyName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const activeFamily = useMemo(() => families.find(f=>f.id===selectedFamilyId) || null, [families, selectedFamilyId]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor'|'viewer'>('editor');

  const [personName, setPersonName] = useState('');
  const [birth, setBirth] = useState('');
  const [death, setDeath] = useState('');
  const [geo, setGeo] = useState<{lat:number|null, lon:number|null}>({lat:null, lon:null});
  const [people, setPeople] = useState<Person[]>([]);

  async function loadFamilies() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/families/mine', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load families');
      setFamilies(j.families);
      if (!selectedFamilyId && j.families?.length) setSelectedFamilyId(j.families[0].id);
    } catch(e:any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  async function createFamily() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/families/create', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name: newFamilyName }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to create family');
      setNewFamilyName('');
      await loadFamilies();
      setSelectedFamilyId(j.id);
    } catch(e:any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function inviteMember() {
    if (!activeFamily) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch('/api/families/members/add', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({
        familyId: activeFamily.id, email: inviteEmail.trim().toLowerCase(), role: inviteRole
      })});
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to add member');
      setInviteEmail('');
      alert('Member added.');
    } catch(e:any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function addPerson() {
    if (!activeFamily) return;
    setLoading(true); setErr(null);
    try {
      const payload = {
        familyId: activeFamily.id,
        name: personName.trim(),
        birthDate: birth.trim() || undefined,
        deathDate: death.trim() || undefined,
        lat: geo.lat ?? undefined,
        lon: geo.lon ?? undefined,
      };
      const r = await fetch('/api/person/create', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to add person');
      setPersonName(''); setBirth(''); setDeath('');
      await loadPeople(activeFamily.id);
    } catch(e:any) { setErr(e.message); } finally { setLoading(false); }
  }

  async function loadPeople(familyId:string) {
    try {
      const r = await fetch('/api/person/list', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ familyId }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to load people');
      setPeople(j.persons);
    } catch (e:any) {
      setErr(e.message);
    }
  }

  // Auto-geolocate (optional)
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setGeo({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {} // ignore error silently
    );
  }, []);

  useEffect(() => { loadFamilies(); }, []);
  useEffect(() => { if (selectedFamilyId) loadPeople(selectedFamilyId); }, [selectedFamilyId]);

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-slate-600">Signed in as <span className="font-mono">{email}</span></p>
      </div>

      {/* Next Steps (now actionable) */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* 1. Create tree */}
        <div className="card">
          <h2 className="font-medium mb-2">Create Family Tree</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Family name"
              value={newFamilyName} onChange={(e)=>setNewFamilyName(e.target.value)} />
            <button className="btn" onClick={createFamily} disabled={!newFamilyName || loading}>Create</button>
          </div>
          <p className="text-xs text-slate-500 mt-2">We’ll generate a Tree ID and make you the admin.</p>
        </div>

        {/* 2. Invite editors */}
        <div className="card">
          <h2 className="font-medium mb-2">Invite Member</h2>
          <div className="mb-2">
            <select className="input w-full" value={selectedFamilyId} onChange={(e)=>setSelectedFamilyId(e.target.value)}>
              <option value="">Select a family…</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name} — {f.treeKey}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="person@email.com" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
            <select className="input" value={inviteRole} onChange={(e)=>setInviteRole(e.target.value as any)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn" onClick={inviteMember} disabled={!selectedFamilyId || !inviteEmail || loading}>Add</button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Admins can grant edit/view access by email.</p>
        </div>

        {/* 3. Quick add person */}
        <div className="card">
          <h2 className="font-medium mb-2">Quick Add Person</h2>
          <div className="mb-2">
            <select className="input w-full" value={selectedFamilyId} onChange={(e)=>setSelectedFamilyId(e.target.value)}>
              <option value="">Select a family…</option>
              {families.map(f => <option key={f.id} value={f.id}>{f.name} — {f.treeKey}</option>)}
            </select>
          </div>
          <input className="input w-full mb-2" placeholder="Name (required)" value={personName} onChange={e=>setPersonName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="input" placeholder="Birth (YYYY-MM-DD, optional)" value={birth} onChange={e=>setBirth(e.target.value)} />
            <input className="input" placeholder="Death (YYYY-MM-DD, optional)" value={death} onChange={e=>setDeath(e.target.value)} />
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Location auto-fills from your device: {geo.lat?.toFixed(4) ?? '—'}, {geo.lon?.toFixed(4) ?? '—'}
          </div>
          <button className="btn" onClick={addPerson} disabled={!selectedFamilyId || !personName || loading}>Add Person</button>
        </div>
      </div>

      {/* Your Trees */}
      <div className="card">
        <h2 className="font-medium mb-2">Your Family Trees</h2>
        {families.length === 0 ? (
          <p className="text-sm text-slate-600">No families yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Name</th>
                  <th>Tree ID</th>
                  <th>Role</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {families.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="py-2">{f.name}</td>
                    <td className="font-mono">{f.treeKey}</td>
                    <td><span className="badge">{f.role}</span></td>
                    <td>{new Date(f.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* People in selected family */}
      {activeFamily && (
        <div className="card">
          <h2 className="font-medium mb-2">People in: {activeFamily.name} <span className="badge ml-2">{activeFamily.treeKey}</span></h2>
          {people.length === 0 ? (
            <p className="text-sm text-slate-600">No people yet. Use “Quick Add Person”.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Name</th>
                    <th>Born</th>
                    <th>Died</th>
                    <th>Lat</th>
                    <th>Lon</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2">{p.name}</td>
                      <td>{p.birthDate ?? '—'}</td>
                      <td>{p.deathDate ?? '—'}</td>
                      <td>{p.lat ?? '—'}</td>
                      <td>{p.lon ?? '—'}</td>
                      <td>{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {err && <div className="text-rose-600 text-sm">{err}</div>}
    </div>
  );
}
