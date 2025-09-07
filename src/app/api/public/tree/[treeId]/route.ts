import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { treeId: string } }) {
  try {
    const treeId = params.treeId;
    if (!treeId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await ensureSchema();
    const { rows } = await sql`
      select cid
      from storage_records
      where tree_id = ${treeId}
      order by created_at desc
      limit 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const cid: string = rows[0].cid;
    const url = new URL(req.url);
    const format = url.searchParams.get('format');
    if (format === 'cid') {
      return NextResponse.json({ cid }, { status: 200 });
    }

    try {
      const resp = await fetch(`https://ipfs.io/ipfs/${cid}`);
      if (!resp.ok) throw new Error('Failed to fetch snapshot');
      const json = await resp.json();
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json({ cid }, { status: 200 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 400 });
  }
}