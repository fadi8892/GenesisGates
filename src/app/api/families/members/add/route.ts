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
     const { familyId, email, role } = z.object({
       familyId: z.string().uuid(),
       email: z.string().email(),
       role: z.enum(['editor', 'viewer'])
     }).parse(await req.json());
+    const treeId = familyId;
 
-    const myRole = await userRoleInFamily(session.email, familyId);
+    const myRole = await userRoleInTree(session.userId, treeId);
     if (myRole !== 'admin') throw new Error('Only admins can add members');
 
+    const u = await sql`
+      insert into users (email) values (${email.toLowerCase()})
+      on conflict (email) do update set email=excluded.email
+      returning id`;
+
     await sql`
-      INSERT INTO memberships (user_email, family_id, role)
-      VALUES (${email.toLowerCase()}, ${familyId}, ${role})
-      ON CONFLICT (user_email, family_id) DO UPDATE SET role=${role}`;
+      INSERT INTO tree_members (user_id, tree_id, role)
+      VALUES (${u.rows[0].id}, ${treeId}, ${role})
+      ON CONFLICT (user_id, tree_id) DO UPDATE SET role=${role}`;
 
     return NextResponse.json({ ok: true }, { status: 200 });
   } catch (e: any) {
     return NextResponse.json({ error: e?.message || 'Failed to add member' }, { status: 400 });
   }
 }
