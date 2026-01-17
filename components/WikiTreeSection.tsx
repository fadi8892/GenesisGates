import Link from "next/link";
import { Search, Network } from "lucide-react";

export default function WikiTreeSection() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-16">
          
          {/* Left visual side */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-[3rem] blur-2xl opacity-50" />
            <div className="relative bg-gray-50 border border-gray-200 rounded-[2rem] p-8 shadow-xl overflow-hidden">
              <div className="flex items-center gap-4 mb-6 opacity-50">
                 <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse"></div>
                 <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                 </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-amber-200 shadow-sm z-10 relative">
                 <div className="bg-amber-100 p-3 rounded-full">
                    <Network className="w-8 h-8 text-amber-600" />
                 </div>
                 <div>
                    <h4 className="text-lg font-bold text-gray-900">WikiTree Integration</h4>
                    <p className="text-sm text-gray-600">Connecting to the global family tree.</p>
                 </div>
              </div>
               <div className="flex items-center gap-4 mt-6 opacity-50 justify-end">
                 <div className="space-y-2 flex-1 text-right">
                    <div className="h-4 bg-gray-200 rounded w-3/4 ml-auto animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 ml-auto animate-pulse"></div>
                 </div>
                  <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Right content side */}
          <div className="w-full md:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium text-sm">
              <Search className="w-4 h-4" />
              <span>Powerful Integration</span>
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 leading-tight">
              Tap into the World's Largest <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Collaborative Tree</span>
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              Don't start from scratch. GenesisGates seamlessly connects with WikiTree, allowing you to search for ancestors and import existing branches directly into your personal visualization.
            </p>

            <ul className="space-y-4 text-gray-700">
                <li className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    Find ancestors already documented by others.
                </li>
                <li className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    Import data with a single click to grow your graph fast.
                </li>
                <li className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    Ensure accuracy by cross-referencing global data.
                </li>
            </ul>

            <div className="pt-4">
              <Link href="/dashboard" className="inline-flex h-12 items-center justify-center rounded-full bg-gray-900 px-8 text-sm font-semibold text-white shadow transition-colors hover:bg-gray-800">
                  Start Connecting Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}