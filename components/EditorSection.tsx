import { ArrowUpRight, Filter, Layers, Orbit, Rows, Wand2 } from "lucide-react";

const layouts = [
  { icon: <Layers className="h-4 w-4" />, label: "Vertical Tree" },
  { icon: <Rows className="h-4 w-4" />, label: "Horizontal Timeline" },
  { icon: <Orbit className="h-4 w-4" />, label: "Radial Map" },
  { icon: <Wand2 className="h-4 w-4" />, label: "Fan Chart" },
];

export default function EditorSection() {
  return (
    <section id="editor" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,_rgba(124,58,237,0.12),_transparent_60%)]" />
      <div className="relative container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">Family Flow Editor</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              The ancestry-killer canvas your users never want to leave.
            </h2>
            <p className="mt-4 text-base text-slate-300">
              Switch layouts instantly, jump to anyone with smart search, and keep every edit safe
              with batch saves. The editor balances a cinematic graph view with a data-dense table
              for managing massive trees.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {layouts.map((layout) => (
                <div
                  key={layout.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                >
                  <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2 text-violet-200">
                    {layout.icon}
                  </span>
                  {layout.label}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                <Filter className="h-3.5 w-3.5" />
                Smart search + camera fly-to
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
                <ArrowUpRight className="h-3.5 w-3.5" />
                GEDCOM export in one click
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/10 p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm text-slate-300">
              <span>Graph View</span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                Saved ✓
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {["Ava Carter", "Noah Carter", "Evelyn Carter"].map((name, index) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{name}</p>
                    <p className="text-xs text-slate-400">
                      {index === 0 ? "Founder" : index === 1 ? "Father" : "Mother"}
                    </p>
                  </div>
                  <div
                    className={`h-3 w-3 rounded-full ${
                      index === 0 ? "bg-violet-400" : index === 1 ? "bg-sky-400" : "bg-pink-400"
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <p className="text-white">Action Bar</p>
                <p className="mt-2">Add Member · Remove Selected</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <p className="text-white">List View</p>
                <p className="mt-2">Quick edit rows with thumbnails</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
