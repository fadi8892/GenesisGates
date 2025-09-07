import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Small helper for env vars
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const STRIPE_SECRET_KEY = requireEnv('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = requireEnv('STRIPE_WEBHOOK_SECRET');

// Use the NEW Stripe API version at runtime.
// The `as any` cast silences TS if your installed `stripe` types still expect the older literal.
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20' as any,
});

// This route receives raw payload for signature verification; using req.text() preserves raw bytes.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await req.text();
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err?.message || err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Handle the event types you care about
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: fulfill the purchase / activate subscription using session.* fields
        // e.g., session.id, session.customer, session.subscription, session.metadata
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // TODO: mark subscription as active/paid
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // TODO: sync subscription status in your DB
        break;
      }
      default:
        // Optionally log unhandled event types
        // console.log(`Unhandled event type: ${event.type}`);
        break;
    }

    // Acknowledge receipt of the event
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err?.message || err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

// Avoid caching for webhooks
export const dynamic = 'force-dynamic';
