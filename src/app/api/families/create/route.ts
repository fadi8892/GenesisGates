import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { newTreeId } from '@/lib/id';

export const runtime = 'nodejs';

const Schema = z.object({
  name: z.string().min(1).max(140),
});

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = requireSession();
    const data = Schema.parse(await req.json());
    const treeId = newTreeId();
    const ins = await sql`insert into trees (tree_key, name, created_by) values (${treeId}, ${data.name}, ${session.userId}) returning id`;
    await sql`insert into tree_members (tree_id, user_id, role) values (${ins.rows[0].id}, ${session.userId}, 'admin')`;
    return NextResponse.json({ id: treeId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create family' }, { status: 400 });
  }
}