import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, TreeDeciduous } from "lucide-react";

export default function Hero() {
  return (
    // Added a relative container with a background image placeholder
    <section className="relative bg-gray-900 text-white overflow-hidden">
      {/* Background Image - Replace '/images/hero-bg.jpg' with your actual image path */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/api/placeholder/1600/900')" }} 
      />
      
      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/80 to-gray-50"></div>

      <div className="relative container mx-auto px-4 py-32 md:py-48 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 font-medium text-sm mb-8 backdrop-blur-sm border border-amber-500/30">
          <TreeDeciduous className="w-4 h-4" />
          <span>Welcome to GenesisGates</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-white drop-shadow-sm">
          Discover Your Story, <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-orange-400">
            One Node at a Time.
          </span>
        </h1>
        
        <p className="text-xl text-gray-200 mb-12 max-w-2xl leading-relaxed drop-shadow-sm">
          Visualize Ancestors. Import GEDCOM files, connect with WikiTree, and collaborate with family in real-time. 
          See it in action instantly.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
          {/* Primary CTA */}
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 font-semibold text-lg h-14 px-8 rounded-full shadow-lg shadow-orange-500/30"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Secondary CTA - The "Free Thing" emphasized */}
          <Link href="/view/demo" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-gray-900 font-semibold text-lg h-14 px-8 rounded-full transition-all"
            >
              See an Instant Demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative bottom shape to blend into the next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
    </section>
  );
}