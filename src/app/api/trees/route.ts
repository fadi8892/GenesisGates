import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { ensureSchema, sql } from '@/lib/db';
import { newTreeId } from '@/lib/id';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const s = requireSession();
    await ensureSchema();
    const { rows } = await sql`
      select t.id, t.name, t.created_at, m.role
      from trees t join tree_members m on m.tree_id = t.id
      where m.user_id = ${s.userId}
      order by t.created_at desc
    `;
    return NextResponse.json(rows);
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const s = requireSession();
    await ensureSchema();
    await rateLimit(`tree:create:${s.userId}`, 10, 86400);
    const data = await req.formData();
    const name = String(data.get('name') || 'Untitled');
    const id = newTreeId();
    await sql`insert into trees (id, name, created_by) values (${id}, ${name}, ${s.userId})`;
    await sql`insert into tree_members (tree_id, user_id, role) values (${id}, ${s.userId}, 'admin')`;
    return NextResponse.redirect(new URL(`/tree/${id}`, process.env.APP_ORIGIN || 'http://localhost:5173'));
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
