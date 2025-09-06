import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';

export const runtime = 'nodejs';

async function ensureAdmin(userId: string, treeId: string) {
  const q = await sql`select 1 from tree_members where tree_id=${treeId} and user_id=${userId} and role='admin'`;
  if (q.rowCount === 0) throw new Error('Forbidden');
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = requireSession();
    await ensureSchema();
    // must be member to see
    const chk = await sql`select role from tree_members where tree_id=${params.id} and user_id=${s.userId}`;
    if (chk.rowCount === 0) throw new Error('Forbidden');
    const { rows } = await sql`
      select u.id, u.email, m.role
      from tree_members m join users u on u.id = m.user_id
      where m.tree_id=${params.id}
      order by u.email
    `;
    return NextResponse.json(rows);
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = requireSession();
    await ensureSchema();
    await ensureAdmin(s.userId, params.id);
    const { email, role } = await req.json();
    const u = await sql`insert into users (email) values (${email}) on conflict (email) do update set email=excluded.email returning *`;
    await sql`insert into tree_members (tree_id, user_id, role) values (${params.id}, ${u.rows[0].id}, ${role}) on conflict (tree_id, user_id) do update set role=excluded.role`;
    return NextResponse.json({ ok: true });
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const s = requireSession();
    await ensureSchema();
    await ensureAdmin(s.userId, params.id);
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) throw new Error('userId required');
    await sql`delete from tree_members where tree_id=${params.id} and user_id=${userId}`;
    return NextResponse.json({ ok: true });
  } catch(e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
