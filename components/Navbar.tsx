import Link from "next/link";
import { TreeDeciduous } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-white/5 bg-[#0b1021]/80 backdrop-blur-md transition-all">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo Area */}
        <div className="flex items-center gap-2 font-bold text-xl text-white tracking-tight">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <TreeDeciduous size={20} />
          </div>
          Genesis
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/login" className="hidden sm:block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-900/20 transition-all">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}