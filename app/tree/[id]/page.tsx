import { notFound } from 'next/navigation'
import TreeViewer from './viewer'
import { readTree } from '@/lib/storage'


export default async function TreePage({ params }: { params: { id: string } }) {
const tree = await readTree(params.id)
if (!tree) return notFound()
return (
<div className="grid gap-4">
<h1 className="text-xl font-semibold">Tree: {params.id}</h1>
<TreeViewer initialTree={tree} />
</div>
)
}
