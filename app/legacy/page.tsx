'use client'
import { useEffect, useState } from 'react'
import LegacyMap from '@/components/LegacyMap'
import CircularTree from '@/components/CircularTree'
import HierarchyTree from '@/components/HierarchyTree'
import Tree3D from '@/components/Tree3D'


export default function LegacyToolsPage() {
const [tab, setTab] = useState<'map'|'circular'|'hierarchy'|'3d'>('map')
const [data, setData] = useState<any>({ people: [] })
const [error, setError] = useState<string|null>(null)


useEffect(() => {
fetch('/api/trees/demo-iraq')
.then(async r => { if (!r.ok) throw new Error(`status ${r.status}`); return r.json() })
.then(setData)
.catch(e => { setError(e.message); setData({ people: [] }) })
}, [])


return (
<div className="min-h-[60vh]">
<h1 className="text-xl font-semibold mb-3">Legacy Viewers</h1>
{error && <div className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded mb-3">{error}</div>}
<div className="flex gap-2 mb-3">
{(['map','circular','hierarchy','3d'] as const).map(t => (
<button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-2xl border text-sm ${tab===t? 'bg-black text-white border-black':'bg-white hover:bg-gray-100'}`}>{t.toUpperCase()}</button>
))}
</div>
<div className="rounded-2xl overflow-hidden border bg-white">
{tab==='map' && <LegacyMap treeData={data} />}
{tab==='circular' && <CircularTree treeData={data} />}
{tab==='hierarchy' && <HierarchyTree treeData={data} />}
{tab==='3d' && <Tree3D treeData={data} />}
</div>
</div>
)
}
