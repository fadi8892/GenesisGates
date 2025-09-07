import { NextResponse } from 'next/server';
import type StripeCtor from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy init so missing envs don’t crash builds
function getStripe(): StripeCtor | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('stripe') as typeof import('stripe');
  const Stripe = (mod as any).default ?? mod;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const mode = body.mode === 'subscription' ? 'subscription' : 'payment';

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  const successUrl = body.successUrl || `${base}/checkout/success`;
  const cancelUrl = body.cancelUrl || `${base}/checkout/cancel`;

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
  return NextResponse.json({ configured: Boolean(process.env.STRIPE_SECRET_KEY) });
}
