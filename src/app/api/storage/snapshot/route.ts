import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { publishSnapshot } from '@/lib/storage';
import { getEntitlementByEmail, getOwnerUsageBytesByEmail } from '@/lib/usage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const s = requireSession();
    await ensureSchema();
    const body = await req.json();
    const { treeId, json, provider, mode, byoToken } = body || {};
    if (!treeId || !json) throw new Error('treeId and json required');

    // Look up the owner email for this treeId (works with your /app/api/trees and storage_records)
    const ownerEmail = await (async ()=>{
      const q = await sql`
        select u.email
        from trees t
        join users u on u.id = t.owner_id
        where t.id=${treeId}
        limit 1`;
      if (q.rows.length) return q.rows[0].email as string;

      // fallback: families table by membership admin (current user)
      const f = await sql`
        select u.email
        from families f
        join users u on u.id = f.owner_id
        join memberships m on m.family_id = f.id
        where f.tree_key=${treeId} and m.user_email=${s.email} and m.role='admin'
        limit 1`;
      return f.rows[0]?.email as string || s.email;
    })();

    // quota check against the owner
    const ent = await getEntitlementByEmail(ownerEmail);
    const used = await getOwnerUsageBytesByEmail(ownerEmail);

    // Do a dry-size estimate: we know bytes only after publish; so bail early if already at/over max
    if (BigInt(ent.max_bytes) <= used) {
      return NextResponse.json({ error: 'UPGRADE_REQUIRED', reason: 'STORAGE_LIMIT' }, { status: 402 });
    }

    // publish to web3.storage
    const { cid, bytes } = await publishSnapshot({ json, provider, mode, byoToken });

    // enforce after actual size known
    if (used + BigInt(bytes) > BigInt(ent.max_bytes)) {
      return NextResponse.json({ error: 'UPGRADE_REQUIRED', reason: 'STORAGE_LIMIT' }, { status: 402 });
    }

    const costCents = Math.max(25 * Math.ceil(bytes / (1024*1024)), 25); // unchanged
    await sql`
      insert into storage_records (tree_id, cid, provider, bytes, mode, cost_cents)
      values (${treeId}, ${cid}, ${provider || 'web3storage'}, ${bytes}, ${mode || 'byo'}, ${mode==='managed' ? costCents : 0})
    `;
    return NextResponse.json({ cid, bytes, costCents }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 });
  }
}
