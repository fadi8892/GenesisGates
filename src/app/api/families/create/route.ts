import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { newTreeId } from '@/lib/id';

export const runtime = 'nodejs';

const ins = await sql`
  insert into trees (tree_key, name, created_by)
  values (${treeId}, ${data.name}, ${session.userId})
  returning id, tree_key as "treeKey"
`;
await sql`
  insert into tree_members (tree_id, user_id, role)
  values (${ins.rows[0].id}, ${session.userId}, 'admin')
`;

// Important: return the UUID as id (and include treeKey for convenience)
return NextResponse.json(
  { id: ins.rows[0].id, treeKey: ins.rows[0].treeKey },
  { status: 200 }
);
