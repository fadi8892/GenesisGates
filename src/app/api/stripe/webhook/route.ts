import { NextResponse } from 'next/server';
import type StripeCtor from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy init
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET).' },
      { status: 501 }
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const payload = await req.text(); // raw body for signature verification

  let event: StripeCtor.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err?.message || err}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeCtor.Checkout.Session;
        // TODO: look up session.client_reference_id or metadata for your user/tree
        // and mark order/subscription active in your DB.
        break;
      }
      // add more cases as needed
      default:
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook handler error' }, { status: 500 });
  }
}

// Stripe sends POSTs; all other methods 405
export function GET() { return NextResponse.json({ ok: true }, { status: 405 }); }
export function PUT() { return NextResponse.json({ ok: true }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ ok: true }, { status: 405 }); }
