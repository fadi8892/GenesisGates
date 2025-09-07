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
      const r = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(j?.error || 'Verification failed');
      // On success, go to dashboard
      window.location.href = '/dashboard';
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Genesis Gates</h1>
        <p className="text-slate-600">
          Your family history with decentralized storage and centralized control.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded border p-4 bg-white">
          <h2 className="text-xl font-semibold mb-2">Welcome</h2>

          {phase === 'start' ? (
            <div className="space-y-2">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
                onClick={start}
                disabled={loading || !email}
              >
                Get Sign-in Code
              </button>
              {err && <div className="text-rose-600 text-sm">{err}</div>}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                className="w-full border rounded px-3 py-2"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
                onClick={verify}
                disabled={loading || !code}
              >
                Verify
              </button>
              {devCode && (
                <div className="text-xs text-slate-500">
                  Dev code: <span className="font-mono">{devCode}</span>
                </div>
              )}
              {err && <div className="text-rose-600 text-sm">{err}</div>}
            </div>
          )}
        </div>

        <div className="rounded border p-4 bg-white">
          <div className="text-sm font-semibold mb-2">How it works</div>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
            <li>Create a Tree ID (you control who can edit).</li>
            <li>Build your family data locally in the browser.</li>
            <li>Publish snapshots to IPFS (BYO token or managed).</li>
          </ol>
          <div className="mt-4">
            <Link className="underline" href="/dashboard">
              Go to dashboard →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
