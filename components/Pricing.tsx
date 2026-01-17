import Link from "next/link";

export default function Pricing() {
  return (
    <section className="py-24 bg-gray-900 text-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400">Start for free, upgrade when you need more.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="rounded-3xl border border-gray-800 bg-gray-800/50 p-8 flex flex-col">
            <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-300">Free</span>
            </div>
            <div className="text-4xl font-bold mb-2">$0<span className="text-lg font-normal text-gray-500">/mo</span></div>
            <p className="text-gray-400 mb-8">Perfect for getting started.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><span className="text-emerald-400">✓</span> Up to 25 people</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-emerald-400">✓</span> Full editor access</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-emerald-400">✓</span> Basic import</li>
            </ul>
            
            <Link href="/dashboard" className="block w-full py-3 text-center rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors font-semibold">
                Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-gray-800 to-gray-900 p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
            <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider">Pro</span>
            </div>
            <div className="text-4xl font-bold mb-2">$12<span className="text-lg font-normal text-gray-500">/mo</span></div>
            <p className="text-gray-400 mb-8">For the serious historian.</p>
            
            <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><span className="text-amber-400">✓</span> 500+ people</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-amber-400">✓</span> WikiTree integration</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-amber-400">✓</span> High-res exports</li>
                <li className="flex items-center gap-3 text-gray-300"><span className="text-amber-400">✓</span> Priority support</li>
            </ul>
            
            <Link href="/dashboard" className="block w-full py-3 text-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white transition-all font-semibold shadow-lg shadow-amber-900/20">
                Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}