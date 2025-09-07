 import { sql } from './db';
 
-export async function userRoleInFamily(userEmail: string, familyId: string): Promise<'admin'|'editor'|'viewer'|null> {
+export async function userRoleInTree(userId: string, treeId: string): Promise<'admin'|'editor'|'viewer'|null> {
   const { rows } = await sql`
-    SELECT role FROM memberships WHERE user_email=${userEmail} AND family_id=${familyId} LIMIT 1`;
+    SELECT role FROM tree_members WHERE user_id=${userId} AND tree_id=${treeId} LIMIT 1`;
   return rows[0]?.role ?? null;
 }
 
 export function canEdit(role: string | null) {
   return role === 'admin' || role === 'editor';
 }
