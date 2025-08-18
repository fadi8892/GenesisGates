"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CodeGate() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function go() {
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9\-]{4,24}$/.test(c)) {
      setErr("Enter a code with letters/numbers (4–24 chars).");
      return;
    }
    router.push(`/t/${encodeURIComponent(c)}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e)=>{ setCode(e.target.value); setErr(null); }}
          placeholder="e.g. GG-DEMO-2025"
          className="flex-1 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 px-3 py-2 outline-none"
        />
        <button onClick={go} className="rounded-lg bg-white text-black font-medium px-4">View</button>
      </div>
      {err && <div className="text-xs text-red-300">{err}</div>}
    </div>
  );
}
