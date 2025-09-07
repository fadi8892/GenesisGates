// app/api/webhooks/stripe/route.ts
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

const STRIPE_SECRET_KEY     = requireEnv('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = requireEnv('STRIPE_WEBHOOK_SECRET');

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing Stripe signature', { status: 400 });

  let event: Stripe.Event;
  try {
    // Use raw text body for signature verification in the App Router
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message);
    return new NextResponse(`Webhook Error: ${err?.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);
        // TODO: mark user as upgraded, provision features, etc.
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        console.log('Subscription event:', event.type, sub.id);
        // TODO: sync subscription state to your DB.
        break;
      }
      default:
        console.log('Unhandled event type:', event.type);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new NextResponse('Webhook handler error', { status: 500 });
  }
}
