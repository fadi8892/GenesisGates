// src/lib/usage.ts
import { sql } from '@/lib/db';

export type Entitlement = {
  plan: 'FREE'|'PRO';
  max_trees: number;
  max_bytes: number;
};

export async function getEntitlementByEmail(email: string): Promise<Entitlement> {
  const { rows } = await sql`
    select e.plan, e.max_trees, e.max_bytes
    from entitlements e
    join users u on u.id = e.user_id
    where u.email = ${email}
    limit 1
  `;
  if (!rows.length) {
    return { plan: 'FREE', max_trees: 1, max_bytes: 1_000_000_000 }; // 1 GB
  }
  return {
    plan: rows[0].plan ?? 'FREE',
    max_trees: Number(rows[0].max_trees ?? 1),
    max_bytes: Number(rows[0].max_bytes ?? 1_000_000_000),
  };
}

export async function getOwnerUsageBytesByEmail(email: string): Promise<bigint> {
  // sums from storage_records across all trees owned by this user
  const { rows } = await sql`
    select coalesce(sum(sr.bytes),0)::bigint as total
    from storage_records sr
    join trees t on t.id = sr.tree_id
    join users u on u.id = t.owner_id
    where u.email = ${email}
  `;
  return BigInt(rows?.[0]?.total ?? 0n);
}

export async function getOwnedTreeCountByEmail(email: string): Promise<number> {
  const { rows } = await sql`
    select count(*)::int as c
    from trees t
    join users u on u.id = t.owner_id
    where u.email = ${email}
  `;
  return Number(rows?.[0]?.c ?? 0);
}
