// Simple ACL helpers. Replace with real DB lookups when ready.

export type Role = 'admin' | 'editor' | 'viewer' | null;

/**
 * Return the user's role within a given tree.
 * In this stub, we default to 'admin' if a userId is present.
 * Swap this to a real SELECT from your memberships table when your DB is wired.
 */
export async function userRoleInTree(opts: { userId: string | null; treeId: string }): Promise<Role> {
  const { userId } = opts;
  if (!userId) return null;
  // Example for later:
  // const { rows } = await sql`select role from tree_members where user_id=${userId} and tree_id=${opts.treeId} limit 1`;
  // return (rows[0]?.role as Role) ?? null;
  return 'admin';
}

/**
 * Can the given role edit a tree?
 */
export function canEdit(role: Role): boolean {
  return role === 'admin' || role === 'editor';
}
