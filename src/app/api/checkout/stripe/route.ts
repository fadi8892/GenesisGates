import { NextResponse } from 'next/server';
import type StripeCtor from 'stripe';

// Server-only, don’t pre-render
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy-init Stripe so missing envs don’t crash at build time
function getStripe(): StripeCtor | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  // Grab the default export from the CJS require
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('stripe') as typeof import('stripe');
  const Stripe = (mod as any).default ?? mod; // support both ESM/CJS shapes

  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const mode = body.mode === 'subscription' ? 'subscription' : 'payment';

  const successUrl =
    body.successUrl ||
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000') +
      '/checkout/success';
  const cancelUrl =
    body.cancelUrl ||
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000') +
      '/checkout/cancel';

  try {
    if (mode === 'subscription') {
      if (!body.priceId) throw new Error('Missing priceId for subscription');
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: String(body.priceId), quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
    }

    // One-time payment
    if (body.priceId) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: String(body.priceId), quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
    }

    if (body.amount && body.currency) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: String(body.currency),
              product_data: { name: 'Custom amount' },
              unit_amount: Number(body.amount),
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
    }

    throw new Error('Provide priceId, or amount & currency');
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 400 });
  }
}

export async function GET() {
  // Health check so builds don't execute Stripe
  return NextResponse.json({ configured: Boolean(process.env.STRIPE_SECRET_KEY) });
}
