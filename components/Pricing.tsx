import Link from "next/link";
import { Crown, Lock } from "lucide-react";

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.12),_transparent_60%)]" />
      <div className="relative container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-400">Tier System</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Simple, transparent pricing</h2>
          <p className="mt-4 text-slate-400">Start free, scale when your family graph explodes.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 flex flex-col backdrop-blur-md">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Free Tier
              <Lock className="h-3.5 w-3.5" />
            </div>
            <div className="text-4xl font-semibold mb-2 text-white">$0<span className="text-lg font-normal text-slate-400">/mo</span></div>
            <p className="text-slate-400 mb-8">Perfect for starters with up to 2 trees.</p>

            <ul className="space-y-4 mb-8 flex-1 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> 2 active trees</li>
              <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Core editor + layouts</li>
              <li className="flex items-center gap-3"><span className="text-emerald-400">✓</span> Basic GEDCOM import</li>
            </ul>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 mb-6">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Create New Tree</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">Limit Reached</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-violet-500/60" />
              </div>
            </div>

            <Link href="/dashboard" className="block w-full py-3 text-center rounded-full border border-white/10 bg-white/10 hover:bg-white/20 transition-colors font-semibold text-white">
              Start Free
            </Link>
          </div>

          <div className="rounded-3xl border border-violet-500/40 bg-gradient-to-b from-[#111827] to-[#050505] p-8 flex flex-col relative overflow-hidden shadow-[0_0_45px_rgba(124,58,237,0.35)]">
            <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
              Pro Tier
              <Crown className="h-3.5 w-3.5" />
            </div>
            <div className="text-4xl font-semibold mb-2 text-white">$12<span className="text-lg font-normal text-slate-400">/mo</span></div>
            <p className="text-slate-400 mb-8">For the serious historian (10 trees).</p>

            <ul className="space-y-4 mb-8 flex-1 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-violet-300">✓</span> Up to 10 trees</li>
              <li className="flex items-center gap-3"><span className="text-violet-300">✓</span> WikiTree integration</li>
              <li className="flex items-center gap-3"><span className="text-violet-300">✓</span> Batch GEDCOM + exports</li>
              <li className="flex items-center gap-3"><span className="text-violet-300">✓</span> Priority support</li>
            </ul>

            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 mb-6">
              <div className="flex items-center justify-between text-sm text-violet-100">
                <span>Create New Tree</span>
                <span className="rounded-full border border-violet-400/40 bg-violet-500/20 px-2 py-1 text-xs">Available</span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                <div className="h-full w-1/5 rounded-full bg-violet-400" />
              </div>
            </div>

            <Link href="/dashboard" className="block w-full py-3 text-center rounded-full bg-violet-500 hover:bg-violet-400 text-white transition-all font-semibold shadow-[0_0_25px_rgba(124,58,237,0.45)]">
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
