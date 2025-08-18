export const dynamic = "force-static";

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1220] to-[#0b1220] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-6">
          <h1 className="text-2xl font-bold">Create a Tree</h1>
          <p className="text-white/70 mt-2">
            Paid creation flow goes here (Stripe or WalletConnect). Export is static-safe now.
          </p>
        </div>
      </div>
    </div>
  );
}
