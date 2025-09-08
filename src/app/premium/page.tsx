// src/app/premium/page.tsx
'use client';

import { useState } from 'react';

/**
 * Premium subscription page. This page explains the benefits of the GenesisGates
 * premium plan and provides a button to subscribe via Stripe Checkout. The
 * subscription price identifier must be configured in an environment variable
 * (NEXT_PUBLIC_STRIPE_PRICE_ID) and a valid STRIPE_SECRET_KEY must be set in
 * your Vercel/Neon deployment. When the user clicks Subscribe, the server
 * creates a new Checkout session and redirects the browser to Stripe.
 */
export default function PremiumPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    // Read the price ID from a public environment variable. When deploying,
    // define NEXT_PUBLIC_STRIPE_PRICE_ID in your environment settings.
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID as string | undefined;
    if (!priceId) {
      setError('Subscription not configured. Please set NEXT_PUBLIC_STRIPE_PRICE_ID.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'subscription', priceId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to create checkout');
      if (j.url) {
        window.location.href = j.url;
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4">
      <div className="card space-y-2">
          <h1 className="text-2xl font-semibold">Premium Plan</h1>
          <p className="text-sm text-slate-400">
            Upgrade to GenesisGates Premium to unlock advanced features and
            unlimited creativity. Premium users enjoy unlimited trees, 3D and
            radial visualisations, high‑resolution graphics and maps, private
            sharing links, collaborative editing with multiple admins, and early
            access to new features. Supporting GenesisGates helps us bring
            high‑end design and genealogy tools to everyone.
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-400">
            <li>Unlimited family trees and members</li>
            <li>Interactive hierarchical and circular tree views</li>
            <li>Upload photos, documents and videos to profiles</li>
            <li>Custom privacy controls and secure sharing</li>
            <li>Collaborative research tools and tasks</li>
            <li>Priority email support</li>
          </ul>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <button className="btn" onClick={subscribe} disabled={loading}>
            {loading ? 'Redirecting…' : 'Subscribe Now'}
          </button>
      </div>
    </div>
  );
}