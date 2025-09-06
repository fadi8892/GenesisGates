import { NextResponse } from 'next/server';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs'; // ensure Node runtime on Vercel

export async function GET() {
  try {
    await ensureSchema();
    const session = requireSession();
    const { rows } = await sql`
      SELECT f.id, f.tree_key AS "treeKey", f.name, m.role, f.created_at AS "createdAt"
      FROM families f
      JOIN memberships m ON m.family_id = f.id
      WHERE m.user_email = ${session.email}
      ORDER BY f.created_at DESC`;
    return NextResponse.json({ families: rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list families' }, { status: 400 });
  }
}
