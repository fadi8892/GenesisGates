import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const origin = process.env.APP_ORIGIN ?? new URL(req.url).origin;

  if (!key || !price) return NextResponse.json({ skipped: true });

  const s = requireSession();
  const stripe = new Stripe(key, { apiVersion: '2025-08-27.basil' as any });
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/dashboard?upgrade=success`,
    cancel_url: `${origin}/dashboard?upgrade=cancel`,
    metadata: { userId: s.userId, email: s.email },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}
