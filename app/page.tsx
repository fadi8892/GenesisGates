import Link from 'next/link'
import StartNewButton from '@/components/StartNewButton'


export default function HomePage() {
return (
<div className="grid gap-6">
<section className="bg-white rounded-2xl border p-5">
<h1 className="text-xl font-semibold mb-2">View a Family Tree</h1>
<p className="text-sm text-gray-600 mb-4">Anyone can view: paste a Tree CID/ID or open a demo.</p>
<form action={(formData) => {
'use server'
}}>
<div className="flex gap-2">
<input name="treeId" placeholder="Enter Tree CID or ID" className="flex-1 border rounded-xl px-3 py-2" />
<Link href="/tree/demo-iraq" className="px-3 py-2 rounded-xl bg-black text-white">Open Demo</Link>
</div>
</form>
</section>


<section className="bg-white rounded-2xl border p-5">
<h2 className="font-semibold mb-2">Start a New Tree (Web3)</h2>
<p className="text-sm text-gray-600 mb-3">Creates a blank tree on your configured Web3 storage (Storacha/Web3.Storage) and gives you the CID as the Tree ID.</p>
<StartNewButton />
</section>


<section className="bg-white rounded-2xl border p-5">
<h2 className="font-semibold mb-2">What’s included</h2>
<ul className="list-disc ml-5 text-sm text-gray-700">
<li>CID‑based public viewer: Map, Circular, Hierarchy, 3D</li>
<li>Stripe & Coinbase payments (unchanged)</li>
<li>Pluggable Web3 storage (Storacha or Web3.Storage)</li>
</ul>
</section>
</div>
)
}
