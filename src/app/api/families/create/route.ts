// src/app/api/families/create/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';              // your Postgres helper
import { requireSession } from '@/lib/auth'; // adjust to your auth util

const CreateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
});

// Simple short key generator like "TG-3F7K9C"
function newTreeKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXZY23456789'; // no confusing chars
  let out = 'TG-';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(); // must provide { userId }
    const body = await req.json();
    const data = CreateFamilySchema.parse(body);

    // Try a few times in case of tree_key collision (unique index recommended)
    let attempt = 0;
    while (true) {
      attempt++;
      const treeKey = newTreeKey();
      try {
        // Insert tree and return UUID and short code
        const ins = await sql<{ id: string; tree_key: string }>`
          insert into trees (tree_key, name, created_by)
          values (${treeKey}, ${data.name}, ${session.userId})
          returning id, tree_key
        `;
        const treeId = ins.rows[0].id;

        // Make creator an admin member
        await sql`
          insert into tree_members (tree_id, user_id, role)
          values (${treeId}, ${session.userId}, 'admin')
        `;

        // Return UUID as id (for client state) + short key for share links
        return NextResponse.json(
          { id: treeId, treeKey: ins.rows[0].tree_key },
          { status: 200 }
        );
      } catch (e: any) {
        // If unique violation on tree_key, retry with a fresh key
        // Postgres unique_violation code: 23505
        if (e?.code === '23505' && attempt < 5) continue;
        throw e;
      }
    }
  } catch (err: any) {
    const message =
      err?.issues?.[0]?.message ||
      err?.message ||
      'Failed to create family';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
