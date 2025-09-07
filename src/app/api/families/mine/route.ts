 import { NextResponse } from 'next/server';
 import { ensureSchema, sql } from '@/lib/db';
 import { requireSession } from '@/lib/auth';
 
 export async function GET() {
   try {
     await ensureSchema();
     const session = requireSession();
     const { rows } = await sql`
-      SELECT f.id, f.tree_key AS "treeKey", f.name, m.role, f.created_at AS "createdAt"
-      FROM families f
-      JOIN memberships m ON m.family_id=f.id
-      WHERE m.user_email=${session.email}
-      ORDER BY f.created_at DESC`;
+      SELECT t.id, t.tree_key AS "treeKey", t.name, m.role, t.created_at AS "createdAt"
+      FROM trees t
+      JOIN tree_members m ON m.tree_id=t.id
+      WHERE m.user_id=${session.userId}
+      ORDER BY t.created_at DESC`;
     return NextResponse.json({ families: rows }, { status: 200 });
   } catch (e: any) {
     return NextResponse.json({ error: e?.message || 'Failed to list families' }, { status: 400 });
   }
 }
