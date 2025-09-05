import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { shortTreeId } from '@/lib/ids';
import { getEntitlementByEmail, getOwnedTreeCountByEmail } from '@/lib/usage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const { name } = z.object({ name: z.string().min(1).max(120) }).parse(body);

    // free-plan guard
    const ent = await getEntitlementByEmail(session.email);
    const owned = await getOwnedTreeCountByEmail(session.email);
    if (owned >= ent.max_trees) {
      return NextResponse.json({ error: 'UPGRADE_REQUIRED', reason: 'TREE_LIMIT' }, { status: 402 });
    }

    // generate unique public key
    const treeKey = await uniqueTreeKey();

    // create the family row w/ owner_id
    const fam = await sql`
      insert into families (tree_key, name, owner_id)
      select ${treeKey}, ${name}, u.id from users u where u.email=${session.email}
      returning *`;

    // grant admin membership by email
    await sql`
      insert into memberships (user_email, family_id, role)
      values (${session.email}, ${fam.rows[0].id}, 'admin')
      on conflict (user_email, family_id) do update set role='admin'`;

    return NextResponse.json({ id: fam.rows[0].id, treeKey, name }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create family' }, { status: 400 });
  }
}

async function uniqueTreeKey() {
  for (let i = 0; i < 8; i++) {
    const k = shortTreeId();
    const { rows } = await sql`select 1 from families where tree_key=${k} limit 1`;
    if (!rows.length) return k;
  }
  throw new Error('Could not allocate tree id');
}
