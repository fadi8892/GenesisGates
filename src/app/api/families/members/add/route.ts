import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { userRoleInTree, canEdit } from '@/lib/acl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Body validation
const Schema = z.object({
  familyId: z.string().optional(),  // alias of treeId in some callers
  treeId: z.string().optional(),
  name: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  birthPlace: z.string().optional().nullable(),
  deathPlace: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lon: z.number().optional().nullable(),
  motherId: z.string().optional().nullable(),
  fatherId: z.string().optional().nullable(),
  spouseId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const session = requireSession();
    const data = Schema.parse(await req.json());
    const treeId = data.familyId ?? data.treeId;
    if (!treeId) throw new Error('Missing treeId/familyId');

    // ACL
    const role = await userRoleInTree(session.userId, treeId);
    if (!canEdit(role)) throw new Error('No edit permission');

    // Normalize dates (YYYY-MM-DD or null)
    const birth =
      data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate) ? data.birthDate : null;
    const death =
      data.deathDate && /^\d{4}-\d{2}-\d{2}$/.test(data.deathDate) ? data.deathDate : null;

    await ensureSchema();

    // If you have a real DB, insert here. The stubbed `sql` won't throw.
    // Example schema (adjust to your real table/columns when ready):
    // const { rows } = await sql`
    //   INSERT INTO persons
    //     (tree_id, name, birth_date, death_date, birth_place, death_place, lat, lon, mother_id, father_id, spouse_id, created_by)
    //   VALUES
    //     (${treeId}, ${data.name}, ${birth}, ${death}, ${data.birthPlace ?? null}, ${data.deathPlace ?? null},
    //      ${data.lat ?? null}, ${data.lon ?? null}, ${data.motherId ?? null}, ${data.fatherId ?? null},
    //      ${data.spouseId ?? null}, ${session.userId})
    //   RETURNING id, tree_id, name, birth_date, death_date, birth_place, death_place, lat, lon, mother_id, father_id, spouse_id, created_at
    // `;

    // Since our sql stub returns no rows, return a synthetic member so the UI stays happy.
    const member = {
      id: crypto.randomUUID(),
      treeId,
      name: data.name,
      birthDate: birth,
      deathDate: death,
      birthPlace: data.birthPlace ?? null,
      deathPlace: data.deathPlace ?? null,
      lat: data.lat ?? null,
      lon: data.lon ?? null,
      motherId: data.motherId ?? null,
      fatherId: data.fatherId ?? null,
      spouseId: data.spouseId ?? null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, member }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 400 });
  }
}
