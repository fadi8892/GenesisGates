"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Fingerprint, Globe, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const uiY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);

  return (
    <div ref={containerRef} className="bg-[#FAFAFA] text-[#1D1D1F] overflow-x-hidden selection:bg-[#0071E3] selection:text-white">
      {/* --- FLOATING NAV --- */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 transition-all duration-500">
        <div className="absolute inset-0 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-black/5" />
        <div className="relative max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-lg">
            <span className="w-5 h-5 bg-[#1D1D1F] rounded-md" /> Genesis
          </div>
          <div className="flex items-center gap-6 text-[13px] font-medium text-[#1D1D1F]/80">
            <Link href="/login" className="hover:text-[#0071E3] transition-colors">Sign in</Link>
            <Link href="/login" className="bg-[#1D1D1F] text-white px-4 py-2 rounded-full hover:bg-[#1D1D1F]/90 transition-transform active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative h-[110vh] flex flex-col items-center justify-center text-center pt-20">
        <motion.div style={{ scale: heroScale, opacity: heroOpacity, y: uiY }} className="relative z-10 max-w-4xl px-6 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/5 shadow-sm text-[11px] font-semibold uppercase tracking-widest text-[#86868B]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-pulse" />
            V 2.0 Platinum
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-semibold tracking-tight leading-[1.05] text-[#1D1D1F]"
          >
            Ancestry. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-[#0071E3] to-[#5E5CE6]">Reimagined.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 text-xl md:text-2xl font-medium text-[#86868B] max-w-2xl leading-relaxed"
          >
            Experience your family history on an infinite, high-performance canvas. 
            Powered by a hybrid rendering engine that feels lighter than air.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex items-center gap-4"
          >
            <Link href="/login" className="group flex items-center gap-2 bg-[#0071E3] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0077ED] transition-all shadow-xl shadow-blue-500/20">
              Launch Console <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Abstract Background Mesh */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-50/50 via-[#FAFAFA] to-[#FAFAFA]" />
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section className="max-w-[1200px] mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
          {/* Card 1: Large */}
          <div className="md:col-span-2 relative group overflow-hidden rounded-[32px] bg-white border border-black/5 shadow-2xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute bottom-0 left-0 p-10">
              <div className="w-12 h-12 rounded-2xl bg-[#0071E3] flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/30">
                <Zap size={24} />
              </div>
              <h3 className="text-3xl font-semibold text-[#1D1D1F] mb-2">120Hz Rendering</h3>
              <p className="text-[#86868B] text-lg max-w-md">Our hybrid Canvas+React engine handles thousands of nodes without dropping a single frame.</p>
            </div>
            {/* Abstract visual */}
            <div className="absolute top-10 right-10 w-64 h-64 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
          </div>

          {/* Card 2: Tall */}
          <div className="relative group overflow-hidden rounded-[32px] bg-[#1D1D1F] text-white shadow-2xl shadow-black/10">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10" />
            <div className="p-10 h-full flex flex-col justify-between">
              <div>
                <ShieldCheck className="text-[#0071E3] mb-6" size={32} />
                <h3 className="text-2xl font-semibold mb-2">The Vault</h3>
                <p className="text-white/60 leading-relaxed">
                  Encryption at rest. Row-level security. Your data is yours alone.
                </p>
              </div>
              <div className="text-sm font-medium text-[#0071E3] flex items-center gap-2">
                Security Architecture <ArrowRight size={12} />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="relative group overflow-hidden rounded-[32px] bg-white border border-black/5 shadow-xl shadow-black/5 p-10 flex flex-col justify-center">
             <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-4">
                <Fingerprint size={24} />
             </div>
             <h3 className="text-xl font-semibold text-[#1D1D1F] mb-1">Biometric Ready</h3>
             <p className="text-[#86868B]">Passkey support coming in v2.1.</p>
          </div>

          {/* Card 4 */}
          <div className="md:col-span-2 relative group overflow-hidden rounded-[32px] bg-gradient-to-br from-[#F5F5F7] to-white border border-black/5 shadow-xl shadow-black/5 p-10 flex items-center justify-between">
             <div className="max-w-md">
               <h3 className="text-3xl font-semibold text-[#1D1D1F] mb-2">Universal Import</h3>
               <p className="text-[#86868B] text-lg">
                 Drag & Drop your GEDCOM or JSON files. We parse, clean, and visualize your history instantly.
               </p>
             </div>
             <div className="hidden md:block w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[#0071E3]">
                <Globe size={40} />
             </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-black/5 bg-white text-center">
        <p className="text-xs text-[#86868B] font-medium">© {new Date().getFullYear()} Genesis Gates. Designed in California.</p>
      </footer>
    </div>
  );
}