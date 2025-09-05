import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  try {
    const { amount = 1000, currency = "usd", name = "Genesis Gates Premium", metadata } = req.body ?? {};
    const origin = req.headers.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name },
            unit_amount: Number(amount),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      payment_method_types: ["card"],
      metadata,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
