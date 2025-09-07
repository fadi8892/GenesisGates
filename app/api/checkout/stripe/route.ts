// app/api/checkout/stripe/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID   = requireEnv('STRIPE_PRICE_ID');

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // or 'payment'
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard?status=success`,
      cancel_url:  `${origin}/dashboard?status=cancel`,
    });

    // Works with a plain <form method="post" action="/api/checkout/stripe">
    return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Stripe error' },
      { status: 500 },
    );
  }
}
