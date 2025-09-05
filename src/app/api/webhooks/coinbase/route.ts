// src/app/api/webhooks/coinbase/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.COINBASE_WEBHOOK_SHARED_SECRET;
  if (!secret) return NextResponse.json({ ok: true, skipped: true });
  const sig = req.headers.get('x-webhook-signature') || '';
  const raw = await req.text();
  const h = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (h !== sig) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });

  const evt = JSON.parse(raw);
  if (evt?.type === 'charge:confirmed') {
    const userId = evt?.event?.data?.metadata?.userId;
    if (userId) {
      await sql`
        insert into entitlements (user_id, plan, max_trees, max_bytes, source)
        values (${userId}, 'PRO', 99, 50_000_000_000, 'coinbase')
        on conflict (user_id) do update set
          plan='PRO', max_trees=99, max_bytes=50_000_000_000, source='coinbase', updated_at=now()
      `;
    }
  }
  return NextResponse.json({ received: true });
}
