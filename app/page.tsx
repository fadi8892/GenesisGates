import Link from "next/link";
import CodeGate from "../components/CodeGate";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0b1220] via-[#0f1b2f] to-[#0b1220]">
      <header className="max-w-6xl mx-auto w-full px-4 py-6 flex items-center justify-between">
        <div className="text-white font-bold text-lg">GenesisGates</div>
        <nav className="text-sm text-white/80 flex gap-4">
          <Link href="/create" className="hover:opacity-80">Create</Link>
          <Link href="/t/GG-DEMO-2025" className="hover:opacity-80">Demo Tree</Link>
          <Link href="/t/GG-DEMO-2025/map" className="hover:opacity-80">Map</Link>
          <Link href="/t/GG-DEMO-2025/nft" className="hover:opacity-80">NFT</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 backdrop-blur">
              Private by default · Multilingual · Future-proof identity
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-bold leading-tight text-white">
              A high-tech gateway to your origins
            </h1>
            <p className="mt-3 text-white/80 text-lg">
              View a family tree with a code. Create new trees (paid). No login to view.
            </p>
            <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5">
              <h3 className="text-white font-semibold">View a Tree</h3>
              <p className="text-white/70 text-sm">Enter your family’s access code.</p>
              <div className="mt-3"><CodeGate /></div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-12 rounded-[40px] bg-emerald-500/30 blur-3xl opacity-20" />
            <div className="relative rounded-[24px] border border-white/10 bg-white/5 backdrop-blur p-6">
              <div className="text-white/80 text-sm">Time-lapse Preview</div>
              <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-white">
                <iframe src="/preview.html" className="w-full h-[360px]" title="preview" />
              </div>
              <p className="text-white/60 text-xs mt-3">
                Preview shows a simplified animation. Use a code to view a real tree.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 text-white/60 text-xs py-6 text-center">
        © {new Date().getFullYear()} GenesisGates
      </footer>
    </div>
  );
}
