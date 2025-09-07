'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'start' | 'verify'>('start');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || 'Failed to send code');
      setDevCode(j?.devCode ?? null);
      setPhase('verify');
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

    async function verify() {
    setLoading(true);
    setErr(null);
    try {
      const payload = {
        email: String(email ?? '').trim().toLowerCase(),
        code: String(code ?? '').trim(),
      };
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Invalid code');
      window.location.href = '/dashboard';
    } catch (e: any) {
      setErr(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h1 className="text-xl font-semibold mb-2">Welcome to Genesis Gates</h1>
        <p className="text-slate-300 mb-4">
          Your family history with decentralized storage and centralized control.
        </p>
        {phase === 'start' ? (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn" onClick={start} disabled={loading || !email}>
              Get Sign-in Code
            </button>
            {err && <div className="text-rose-500 text-sm">{err}</div>}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" onClick={verify} disabled={loading || !code}>
              Verify
            </button>
            {devCode && (
              <div className="text-xs text-slate-400">
                Dev code: <span className="font-mono">{devCode}</span>
              </div>
            )}
            {err && <div className="text-rose-500 text-sm">{err}</div>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="text-sm font-semibold mb-2">How it works</div>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-300">
          <li>Create a Tree ID (you control who can edit).</li>
          <li>Build your family data locally in the browser.</li>
          <li>Publish snapshots to IPFS (BYO token or managed).</li>
        </ol>
      </div>
    </div>
  );
}
