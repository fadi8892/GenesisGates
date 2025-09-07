 import { NextResponse } from 'next/server';
 import { z } from 'zod';
 import { ensureSchema, sql } from '@/lib/db';
 import { requireSession } from '@/lib/auth';
-import { userRoleInFamily } from '@/lib/acl';
+import { userRoleInTree } from '@/lib/acl';
 
 export const runtime = 'nodejs';
 
 export async function POST(req: Request) {
   try {
     await ensureSchema();
     const session = requireSession();
     const { familyId } = z.object({ familyId: z.string().uuid() }).parse(await req.json());
+    const treeId = familyId;
 
     // View permission: any membership is enough
-    const role = await userRoleInFamily(session.email, familyId);
-    if (!role) throw new Error('Not a member of this family');
+    const role = await userRoleInTree(session.userId, treeId);
+    if (!role) throw new Error('Not a member of this tree');
 
     const { rows } = await sql`
       SELECT id, name, birth_date AS "birthDate", death_date AS "deathDate", lat, lon, created_at AS "createdAt"
-      FROM persons WHERE family_id=${familyId}
+      FROM persons WHERE tree_id=${treeId}
       ORDER BY created_at DESC`;
 
     return NextResponse.json({ persons: rows }, { status: 200 });
   } catch (e: any) {
     return NextResponse.json({ error: e?.message || 'Failed to list persons' }, { status: 400 });
   }
 }
