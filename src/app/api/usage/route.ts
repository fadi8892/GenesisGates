// src/app/api/usage/route.ts
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getEntitlementByEmail, getOwnedTreeCountByEmail, getOwnerUsageBytesByEmail } from '@/lib/usage';

export const runtime = 'nodejs';

export async function GET() {
  const s = requireSession();
  const ent = await getEntitlementByEmail(s.email);
  const treeCount = await getOwnedTreeCountByEmail(s.email);
  const totalBytes = await getOwnerUsageBytesByEmail(s.email);
  return NextResponse.json({
    plan: ent.plan,
    maxTrees: ent.max_trees,
    maxBytes: ent.max_bytes,
    treeCount,
    totalBytes: Number(totalBytes),
  });
}
