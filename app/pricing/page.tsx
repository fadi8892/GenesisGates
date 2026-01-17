export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-4xl font-black tracking-tight">Plans</div>
        <p className="mt-4 text-white/55">
          Tier enforcement is already wired (node limits). Next step is Stripe.
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xl font-semibold">Free</div>
            <div className="mt-2 text-white/55">Up to 25 people, full editor.</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 p-6">
            <div className="text-xl font-semibold">Pro</div>
            <div className="mt-2 text-white/55">500 people, exports, advanced relationships.</div>
          </div>
        </div>

        <a href="/" className="mt-10 inline-block text-white/60 hover:text-white transition">
          ← Back
        </a>
      </div>
    </div>
  );
}
