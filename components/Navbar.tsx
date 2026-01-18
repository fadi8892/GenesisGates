import Link from "next/link";
import { Layers3 } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl transition-all">
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2 text-xl font-semibold text-white tracking-tight">
          <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-1.5 text-violet-300 shadow-[0_0_20px_rgba(124,58,237,0.45)]">
            <Layers3 size={20} />
          </div>
          Genesis Gates
        </div>

        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="#journey" className="transition hover:text-white">Journey</Link>
          <Link href="#editor" className="transition hover:text-white">Editor</Link>
          <Link href="#architecture" className="transition hover:text-white">Architecture</Link>
          <Link href="#pricing" className="transition hover:text-white">Pricing</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-300 transition hover:text-white">
            Sign In
          </Link>
          <Link
            href="/login"
            className="hidden rounded-full border border-violet-500/40 bg-violet-500/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(124,58,237,0.35)] transition hover:bg-violet-500/40 md:block"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
