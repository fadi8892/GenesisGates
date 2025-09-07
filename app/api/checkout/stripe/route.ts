import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// If you already have a requireEnv helper, keep it.
// This inline version is safe and tiny.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
const STRIPE_PRICE_ID   = requireEnv('STRIPE_PRICE_ID');

// Use the NEW Stripe API version at runtime.
// The `as any` cast silences TypeScript if your installed `stripe` package
// hasn't updated its literal union yet.
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20' as any,
});

export async function POST(req: NextRequest) {
  try {
    const { quantity = 1, success_url, cancel_url, metadata } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // change to 'payment' if you sell one-time products
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity,
        },
      ],
      success_url:
        success_url ?? `${req.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancel_url ?? `${req.nextUrl.origin}/checkout/cancelled`,
      metadata: metadata ?? undefined,
    });

    return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unexpected error' },
      { status: 500 }
    );
  }
}
