import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const sig = req.headers["stripe-signature"] as string;
  if (!sig) return res.status(400).send("Missing signature");

  try {
    const buf = await buffer(req);
    const event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // 🔓 Unlock features here (replace with your DB call)
      // const userId = session.metadata?.userId as string | undefined;
      // await db.user.update({ where: { id: userId }, data: { isPaid: true, paidAt: new Date(), provider: "stripe", txnId: session.id } });

      console.log("✅ Payment confirmed:", session.id);
    }

    res.json({ received: true });
  } catch (e: any) {
    res.status(400).send(`Webhook Error: ${e.message}`);
  }
}
