diff --git a/src/app/dashboard/client.tsx b/src/app/dashboard/client.tsx
index 8d881ddea70f27a327b0e1bc61cf7198e922d15c..8567ef0246d9870dba00ced91aab53b0664c2af0 100644
--- a/src/app/dashboard/client.tsx
+++ b/src/app/dashboard/client.tsx
@@ -1,67 +1,71 @@
 'use client';
 import { useEffect, useMemo, useState } from 'react';
+import { BrowserProvider } from 'ethers';
 
 type Family = { id: string; treeKey: string; name: string; role: 'admin'|'editor'|'viewer'; createdAt: string };
 type Person = { id: string; name: string; birthDate: string|null; deathDate: string|null; lat?: number|null; lon?: number|null; createdAt: string };
 
 // Helper: parse JSON or throw a readable error if the server returned HTML/text
 async function jsonOrThrow(r: Response) {
   const ct = r.headers.get('content-type') || '';
   const text = await r.text(); // read once
   if (!ct.includes('application/json')) {
     // Usually an HTML error page or a redirect target
     throw new Error(`Non-JSON response from ${r.url} (status ${r.status}). ${text.slice(0, 140)}`);
   }
   let j: any;
   try { j = JSON.parse(text); } catch {
     throw new Error(`Invalid JSON from ${r.url} (status ${r.status}).`);
   }
   if (!r.ok) {
     throw new Error(j?.error || `HTTP ${r.status} from ${r.url}`);
   }
   return j;
 }
 
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
 
+  const [walletAddress, setWalletAddress] = useState<string|null>(null);
+  const [walletLoading, setWalletLoading] = useState(false);
+
   async function loadFamilies() {
     setLoading(true); setErr(null);
     try {
       const r = await fetch('/api/families/mine', { cache: 'no-store' });
       const j = await jsonOrThrow(r);
       setFamilies(j.families || []);
       if (!selectedFamilyId && j.families?.length) setSelectedFamilyId(j.families[0].id);
     } catch(e:any) {
       setErr(e.message);
       console.error('loadFamilies failed:', e);
     } finally { setLoading(false); }
   }
 
   async function createFamily() {
     setLoading(true); setErr(null);
     try {
       const r = await fetch('/api/families/create', {
         method:'POST',
         headers:{'content-type':'application/json'},
         body: JSON.stringify({ name: newFamilyName })
       });
       const j = await jsonOrThrow(r);
       setNewFamilyName('');
       await loadFamilies();
       setSelectedFamilyId(j.id);
diff --git a/src/app/dashboard/client.tsx b/src/app/dashboard/client.tsx
index 8d881ddea70f27a327b0e1bc61cf7198e922d15c..8567ef0246d9870dba00ced91aab53b0664c2af0 100644
--- a/src/app/dashboard/client.tsx
+++ b/src/app/dashboard/client.tsx
@@ -97,84 +101,136 @@ export default function DashboardClient({ email }: { email: string }) {
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
       const r = await fetch('/api/person/create', {
         method:'POST',
         headers:{'content-type':'application/json'},
         body: JSON.stringify(payload)
       });
       await jsonOrThrow(r);
       setPersonName(''); setBirth(''); setDeath('');
       await loadPeople(activeFamily.id);
     } catch(e:any) {
       setErr(e.message);
       console.error('addPerson failed:', e);
     } finally { setLoading(false); }
   }
 
+  async function loadWallet() {
+    try {
+      const r = await fetch('/api/auth/wallet', { cache: 'no-store' });
+      if (r.ok) {
+        const j = await r.json();
+        setWalletAddress(j.walletAddress || null);
+      }
+    } catch (e) {
+      console.error('loadWallet failed:', e);
+    }
+  }
+
+  async function verifyWallet() {
+    if (!(window as any).ethereum) {
+      alert('No wallet detected');
+      return;
+    }
+    setWalletLoading(true); setErr(null);
+    try {
+      const provider = new BrowserProvider((window as any).ethereum);
+      const signer = await provider.getSigner();
+      const addr = await signer.getAddress();
+      const message = `Link wallet ${addr} to Genesis Gates account ${email}`;
+      const signature = await signer.signMessage(message);
+      const r = await fetch('/api/auth/wallet', {
+        method: 'POST',
+        headers: { 'content-type': 'application/json' },
+        body: JSON.stringify({ message, signature })
+      });
+      const j = await jsonOrThrow(r);
+      setWalletAddress(j.walletAddress);
+    } catch(e:any) {
+      setErr(e.message);
+      console.error('verifyWallet failed:', e);
+    } finally {
+      setWalletLoading(false);
+    }
+  }
+
   async function loadPeople(familyId:string) {
     try {
       const r = await fetch('/api/person/list', {
         method:'POST',
         headers:{'content-type':'application/json'},
         body: JSON.stringify({ familyId })
       });
       const j = await jsonOrThrow(r);
       setPeople(j.persons || []);
     } catch (e:any) {
       setErr(e.message);
       console.error('loadPeople failed:', e);
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
 
-  useEffect(() => { loadFamilies(); }, []);
+  useEffect(() => { loadFamilies(); loadWallet(); }, []);
   useEffect(() => { if (selectedFamilyId) loadPeople(selectedFamilyId); }, [selectedFamilyId]);
 
   return (
     <div className="space-y-6">
       <div className="card">
         <h1 className="text-xl font-semibold">Dashboard</h1>
         <p className="text-slate-600">Signed in as <span className="font-mono">{email}</span></p>
       </div>
 
+      <div className="card">
+        <h2 className="font-medium mb-2">Wallet Verification</h2>
+        {walletAddress ? (
+          <p className="text-sm text-green-700">
+            Verified: <span className="font-mono">{walletAddress}</span>
+          </p>
+        ) : (
+          <button className="btn" onClick={verifyWallet} disabled={walletLoading}>
+            {walletLoading ? 'Verifying…' : 'Verify Wallet'}
+          </button>
+        )}
+      </div>
+
       <div className="grid md:grid-cols-3 gap-4">
         <div className="card">
           <h2 className="font-medium mb-2">Create Family Tree</h2>
           <div className="flex gap-2">
             <input className="input flex-1" placeholder="Family name"
               value={newFamilyName} onChange={(e)=>setNewFamilyName(e.target.value)} />
             <button className="btn" onClick={createFamily} disabled={!newFamilyName || loading}>Create</button>
           </div>
           <p className="text-xs text-slate-500 mt-2">We’ll generate a Tree ID and make you the admin.</p>
         </div>
 
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
