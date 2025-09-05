'use client'
import { useState } from 'react'
import LegacyMap from '@/components/LegacyMap'
import CircularTree from '@/components/CircularTree'
import HierarchyTree from '@/components/HierarchyTree'
import Tree3D from '@/components/Tree3D'
import type { TreeData } from '@/lib/types'


export default function TreeViewer({ initialTree }: { initialTree: TreeData }) {
const [tab, setTab] = useState<'map' | 'circular' | 'hierarchy' | '3d'>('map')
const tabs = [
{ id: 'map', label: 'Map' },
{ id: 'circular', label: 'Circular' },
{ id: 'hierarchy', label: 'Hierarchy' },
{ id: '3d', label: '3D' },
]


return (
<div>
<div className="flex gap-2 mb-3">
{tabs.map(t => (
<button key={t.id} onClick={() => setTab(t.id as any)} className={`px-3 py-1.5 rounded-2xl border text-sm ${tab===t.id? 'bg-black text-white border-black':'bg-white hover:bg-gray-100'}`}>{t.label}</button>
))}
</div>
<div className="rounded-2xl overflow-hidden border bg-white">
{tab==='map' && <LegacyMap treeData={initialTree} />}
{tab==='circular' && <CircularTree treeData={initialTree} />}
{tab==='hierarchy' && <HierarchyTree treeData={initialTree} />}
{tab==='3d' && <Tree3D treeData={initialTree} />}
</div>
</div>
)
}
