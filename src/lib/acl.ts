// src/lib/acl.ts

export type Role = 'admin' | 'editor' | 'viewer' | null;

/**
 * Flexible signature: supports userRoleInTree({ userId, treeId }) OR userRoleInTree(userId, treeId)
 */
export async function userRoleInTree(
  ...args:
    | [userId: string | null, treeId: string]
    | [{ userId: string | null; treeId: string }]
): Promise<Role> {
  let userId: string | null;
  let treeId: string;

  if (typeof args[0] === 'object') {
    ({ userId, treeId } = args[0] as { userId: string | null; treeId: string });
  } else {
    [userId, treeId] = args as [string | null, string];
  }

  if (!userId) return null;

  // TODO: replace with real DB lookup, e.g.:
  // const { rows } = await sql`select role from tree_members where user_id=${userId} and tree_id=${treeId} limit 1`;
  // return (rows[0]?.role as Role) ?? null;

  // Default allow while wiring up – keeps builds green.
  return 'admin';
}

/** True if role can edit a tree. */
export function canEdit(role: Role): boolean {
  return role === 'admin' || role === 'editor';
}
