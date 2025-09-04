import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureSchema, sql } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import { userRoleInFamily, canEdit } from '@/lib/acl';

const Schema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(140),
  birthDate: z.string().optional(), // YYYY-MM-DD (optional)
  deathDate: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const session = requireSession();
    const data = Schema.parse(await req.json());
    const role = await userRoleInFamily(session.email, data.familyId);
    if (!canEdit(role)) throw new Error('No edit permission');

    const birth = data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate) ? data.birthDate : null;
    const death = data.deathDate && /^\d{4}-\d{2}-\d{2}$/.test(data.deathDate) ? data.deathDate : null;

    const res = await sql`
      INSERT INTO persons (family_id, name, birth_date, death_date, lat, lon, created_by)
      VALUES (${data.familyId}, ${data.name}, ${birth}, ${death}, ${data.lat ?? null}, ${data.lon ?? null}, ${session.email})
      RETURNING id`;

    return NextResponse.json({ id: res.rows[0].id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to add person' }, { status: 400 });
  }
}
