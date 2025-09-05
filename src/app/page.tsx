import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <section className="card">
        <h1 className="text-3xl font-bold">Discover your story with GenesisGates</h1>
        <p className="mt-2 text-slate-700">
          Build beautiful trees, map migrations, import GEDCOM, and invite family to collaborate.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard" className="btn">Open Dashboard</Link>
          <a href="https://vercel.com" target="_blank" className="btn bg-slate-800 hover:bg-slate-900">Deploy on Vercel</a>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Tree Views</h3>
          <p className="text-sm text-slate-700">Circular, pedigree and radial graph views.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Map + Migration</h3>
          <p className="text-sm text-slate-700">Markers + path lines between life events.</p>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">GEDCOM</h3>
          <p className="text-sm text-slate-700">Import & export your genealogy data.</p>
        </div>
      </section>
    </div>
  );
}
