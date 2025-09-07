// app/api/checkout/stripe/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Fallbacks with your placeholder so it "works" even if envs aren't set.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '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';
const STRIPE_PRICE_ID   = process.env.STRIPE_PRICE_ID   ?? 'price_1S3psH0vZXfx8jkLvZUmsAnI';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  try {
    // Build absolute URLs from the current request (works on Vercel + localhost)
    const origin = req.nextUrl.origin.replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // or 'payment'
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/dashboard?status=success`,
      cancel_url:  `${origin}/dashboard?status=cancel`,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Stripe error' },
      { status: 500 },
    );
  }
}
