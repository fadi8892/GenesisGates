import Link from "next/link";
import { ArrowUpRight, FileUp, Network } from "lucide-react";

export default function WikiTreeSection() {
  return (
    <section id="import" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,_rgba(124,58,237,0.12),_transparent_55%)]" />
      <div className="relative container mx-auto px-4">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
              Global Data Sync
            </div>
            <h2 className="text-4xl font-semibold text-white">
              Import legacy records and connect to the world&apos;s largest trees.
            </h2>
            <p className="text-lg text-slate-300">
              Pull in GEDCOM files and WikiTree branches without breaking your flow. The parser
              sanitizes IDs, strips invisible characters, and uploads thousands of records in
              controlled batches of 100.
            </p>
            <ul className="space-y-4 text-slate-300">
              {[
                "Smart GEDCOM uploader with error recovery.",
                "WikiTree search brings existing ancestors into your canvas.",
                "Automatic profile creation keeps every import organized.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 pt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(124,58,237,0.4)] transition hover:bg-violet-400"
              >
                Start Importing
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/view/demo"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View Example
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/10 p-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 text-violet-300">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">WikiTree Bridge</p>
                <h3 className="text-lg font-semibold text-white">Connected to 39M profiles</h3>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { title: "GEDCOM Batch Upload", detail: "Processing 3,200 records" },
                { title: "ID Sanitizer", detail: "Normalized 100%" },
                { title: "Relationship Mapper", detail: "Parents → Children linked" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 p-2 text-violet-200">
                    <FileUp className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
