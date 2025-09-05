import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { amount = 1000, currency = "usd", name = "Genesis Gates Premium", metadata } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // or "subscription"
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name },
            unit_amount: Number(amount), // cents
          },
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/cancel`,
      payment_method_types: ["card"],
      metadata, // e.g. { userId, treeId }
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
