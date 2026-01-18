import Feature from './Feature';
import {
  Database,
  LayoutGrid,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section id="architecture" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.15),_transparent_55%)]" />
      <div className="relative container mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-violet-400">Under the Hood</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Built for massive family graphs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400">
            A modern, performance-first stack powers the cyber-genealogy experience, from
            ultra-fast rendering to secure multi-tenant data storage.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Next.js 15 + React 19"
            description="App Router, streaming, and client-side islands keep the editor fluid even with thousands of nodes."
            icon={<Sparkles className="h-6 w-6" />}
          />
          <Feature
            title="React Flow Core"
            description="useNodesState + useEdgesState provide high-performance graph rendering, snapping, and selection."
            icon={<Network className="h-6 w-6" />}
          />
          <Feature
            title="Supabase + RLS"
            description="Profiles, trees, nodes, and edges stay protected by row-level policies so only owners can edit."
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <Feature
            title="Layout Engine"
            description="Dagre for vertical/horizontal trees plus custom trig layouts for radial and fan charts."
            icon={<Workflow className="h-6 w-6" />}
          />
          <Feature
            title="Batch GEDCOM Import"
            description="Regex-based parser cleans IDs and uploads in batches of 100 to prevent timeouts or crashes."
            icon={<Database className="h-6 w-6" />}
          />
          <Feature
            title="Pro-Grade Canvas"
            description="Infinite zoom/pan, spring transitions, and smart search keep the focus on every ancestor."
            icon={<LayoutGrid className="h-6 w-6" />}
          />
        </div>
      </div>
    </section>
  );
}
