import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { shortTreeId } from '@/lib/ids';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const { name } = z.object({ name: z.string().min(1).max(120) }).parse(body);

    // generate unique tree_key
    let treeKey = shortTreeId();
    for (let i = 0; i < 5; i++) {
      const { rows } = await sql`SELECT 1 FROM families WHERE tree_key=${treeKey}`;
      if (rows.length === 0) break;
      treeKey = shortTreeId();
    }

    const fam = await sql`
      INSERT INTO families (tree_key, name, created_by)
      SELECT ${treeKey}, ${name}, u.id FROM users u WHERE u.email=${session.email}
      RETURNING *`;

    // grant admin membership to creator by email
    await sql`
      INSERT INTO memberships (user_email, family_id, role)
      VALUES (${session.email}, ${fam.rows[0].id}, 'admin')
      ON CONFLICT (user_email, family_id) DO UPDATE SET role='admin'`;

    return NextResponse.json({ id: fam.rows[0].id, treeKey, name }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create family' }, { status: 400 });
  }
}
