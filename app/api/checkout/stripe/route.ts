import { NextResponse } from 'next/server';
import type StripeType from 'stripe';

// Run only on the server, and don’t pre-render this
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy-init Stripe so we don't crash at build time if env is missing
function getStripe(): StripeType | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Import inside function to avoid bundling if not configured
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require('stripe') as typeof import('stripe');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export async function POST(req: Request) {
  // Optional body schema: { mode?: 'payment'|'subscription', priceId?: string, successUrl?: string, cancelUrl?: string, amount?: number, currency?: string }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const mode = body.mode === 'subscription' ? 'subscription' : 'payment';

  // You can set defaults via env (kept optional to avoid build-time crashes)
  const successUrl =
    body.successUrl ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') + '/checkout/success' ||
    'http://localhost:3000/checkout/success';
  const cancelUrl =
    body.cancelUrl ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') + '/checkout/cancel' ||
    'http://localhost:3000/checkout/cancel';

  try {
    if (mode === 'subscription') {
      if (!body.priceId) throw new Error('Missing priceId for subscription');
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: body.priceId as string, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
    } else {
      // one-time payment
      if (body.priceId) {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{ price: body.priceId as string, quantity: 1 }],
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
      } else if (body.amount && body.currency) {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: String(body.currency),
              product_data: { name: 'Custom amount' },
              unit_amount: Number(body.amount),
            },
            quantity: 1,
          }],
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
        return NextResponse.json({ id: session.id, url: session.url }, { status: 200 });
      } else {
        throw new Error('Provide priceId, or amount & currency');
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 400 });
  }
}

export async function GET() {
  // Simple health check so builds don’t try to execute Stripe
  const configured = Boolean(process.env.STRIPE_SECRET_KEY);
  return NextResponse.json({ configured });
}
