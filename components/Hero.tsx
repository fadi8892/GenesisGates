import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#050505] pb-24 pt-28 text-white sm:pt-32">
      <div className="absolute inset-0">
        <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute right-0 top-0 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(124,58,237,0.08)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(124,58,237,0.08)_1px,_transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative container mx-auto px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-violet-200 shadow-[0_0_25px_rgba(124,58,237,0.25)]">
            <Sparkles className="h-4 w-4" />
            Cyber-Genealogy Workspace
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-6xl">
            Design a living family map that feels like a
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
              futuristic command center.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Genesis Gates is the modern, dark-mode family tree platform that blends glassmorphism,
            AI-like search, and dynamic layouts so you can preserve every story with clarity.
          </p>

          <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <Link href="/login" className="w-full sm:w-auto">
              <span className="flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 px-8 py-4 text-sm font-semibold text-white shadow-[0_0_30px_rgba(124,58,237,0.45)] transition hover:bg-violet-400">
                Launch Your Tree
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/view/demo" className="w-full sm:w-auto">
              <span className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
                Explore the Demo
              </span>
            </Link>
          </div>

          <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: "Infinite Canvas", value: "Zoom & Pan" },
              { label: "Smart Search", value: "Instant Focus" },
              { label: "Secure Sync", value: "Supabase RLS" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left backdrop-blur-md"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
