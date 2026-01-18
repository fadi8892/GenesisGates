import Link from "next/link";
import { ArrowRight, TreeDeciduous } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative bg-[#0b1021] text-white overflow-hidden pt-20">
      {/* Background Effect */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-[#0b1021] to-[#0b1021]"></div>
      
      <div className="relative container mx-auto px-4 py-32 md:py-40 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-300 font-medium text-sm mb-8 border border-blue-500/20 backdrop-blur-md">
          <TreeDeciduous className="w-4 h-4" />
          <span>Genesis Gates v2.0</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white leading-tight">
          Discover Your Story, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            One Node at a Time.
          </span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl leading-relaxed">
          Visualize your ancestry on an infinite canvas. Connect with WikiTree, import GEDCOMs, and preserve your legacy securely.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Primary CTA - Updated to point to /login */}
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>

          {/* Secondary CTA */}
          <Link href="/view/demo" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-semibold transition-all backdrop-blur-sm">
              View Instant Demo
            </button>
          </Link>
        </div>
      </div>

      {/* Curve Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </section>
  );
}