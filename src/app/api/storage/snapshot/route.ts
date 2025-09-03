import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { publishSnapshot } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const s = requireSession();
    await ensureSchema();
    const body = await req.json();
    const { treeId, json, provider, mode, byoToken } = body || {};
    if (!treeId || !json) throw new Error('treeId and json required');
    // Check role (editor or admin)
    const r = await sql`select role from tree_members where tree_id=${treeId} and user_id=${s.userId}`;
    if (r.rowCount === 0) throw new Error('Forbidden');
    const role = r.rows[0].role as string;
    if (!['editor','admin'].includes(role)) throw new Error('Forbidden');

    const { cid, bytes } = await publishSnapshot({ json, provider, mode, byoToken });
    const costCents = Math.max(25 * Math.ceil(bytes / (1024*1024)), 25);
    await sql`
      insert into storage_records (tree_id, cid, provider, bytes, mode, cost_cents)
      values (${treeId}, ${cid}, ${provider || 'web3storage'}, ${bytes}, ${mode || 'byo'}, ${mode==='managed' ? costCents : 0})
    `;
    return NextResponse.json({ cid, bytes, costCents }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 });
  }
}
