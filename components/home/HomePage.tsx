"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import MemberGraphCard from "./MemberGraphCard";

const ease = [0.22, 1, 0.36, 1] as const;

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-zinc-950">
      <TopNav />

      <main className="mx-auto max-w-6xl px-6">
        <Hero />

        <Section
          eyebrow="Live graph"
          title="Create members. Watch connections appear."
          desc="Smooth node creation, animated edges, pan/zoom, and a clean UI that feels finished."
        >
          <MemberGraphCard />
        </Section>

        <Section
          eyebrow="Why it feels premium"
          title="Fast, minimal, and intentional."
          desc="Apple-level polish is mostly spacing, typography, subtle motion, and zero jank."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Smooth motion"
              desc="Transform-based animations only. No layout thrash."
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Stable layout"
              desc="No CLS. Predictable widths. Consistent gutters."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="Clean UI"
              desc="Tight type scale, soft borders, subtle shadows."
            />
          </div>
        </Section>

        <footer className="py-12 text-sm text-zinc-500">
          © {new Date().getFullYear()} Your Company
        </footer>
      </main>
    </div>
  );
}

function TopNav() {
  return (
    <div className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="font-semibold tracking-tight">YourBrand</div>
        <div className="flex items-center gap-2">
          <button className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Docs
          </button>
          <button className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="max-w-2xl"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Polished, smooth, production-ready
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          A homepage that looks finished.
        </h1>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-zinc-600">
          Clean layout, premium motion, and a live member graph where connections
          animate in beautifully.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button className="group inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800">
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
            Watch demo
          </button>
        </div>
      </motion.div>
    </section>
  );
}

function Section({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-14 sm:py-18">
      <div className="mb-8 max-w-2xl">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-600">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
        {icon}
      </div>
      <div className="mt-4 font-medium">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-zinc-600">{desc}</div>
    </div>
  );
}
