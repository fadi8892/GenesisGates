// src/app/api/families/create/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
// Adjust these imports to your project structure:
import { sql } from '@/lib/db';              // your Postgres helper
import { requireSession } from '@/lib/auth'; // or however you get userId/session
import { newTreeId } from '@/lib/ids';       // your short tree key generator

const CreateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession(); // should throw or return { userId }
    const body = await req.json();
    const data = CreateFamilySchema.parse(body);

    // Generate your short tree key (e.g., "TG-ABCDE")
    const treeKey = newTreeId();

    // Insert tree and return the UUID *and* the short code
    const ins = await sql<{
      id: string;
      tree_key: string;
    }>`
      insert into trees (tree_key, name, created_by)
      values (${treeKey}, ${data.name}, ${session.userId})
      returning id, tree_key
    `;

    const treeId = ins.rows[0].id;

    // Make the creator an admin member
    await sql`
      insert into tree_members (tree_id, user_id, role)
      values (${treeId}, ${session.userId}, 'admin')
    `;

    // IMPORTANT: return the *UUID* as id, and include treeKey for convenience
    return NextResponse.json(
      { id: treeId, treeKey: ins.rows[0].tree_key },
      { status: 200 }
    );
  } catch (err: any) {
    // Zod or auth/db error handling
    const message =
      err?.issues?.[0]?.message ||
      err?.message ||
      'Failed to create family';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
