// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const wh = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !wh) return NextResponse.json({ ok: true, skipped: true });

  const stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' as any });
  const sig = req.headers.get('stripe-signature')!;
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, wh);
  } catch (err) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s?.metadata?.userId;
    const customer = (s.customer as string) || null;
    if (userId) {
      await sql`
        insert into entitlements (user_id, plan, max_trees, max_bytes, source, external_customer_id)
        values (${userId}, 'PRO', 99, 50_000_000_000, 'stripe', ${customer})
        on conflict (user_id) do update set
          plan='PRO', max_trees=99, max_bytes=50_000_000_000, source='stripe',
          external_customer_id=${customer}, updated_at=now()
      `;
    }
  }
  return NextResponse.json({ received: true });
}
