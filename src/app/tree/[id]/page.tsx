import Link from 'next/link';
import { sql, ensureSchema } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import TreeClient from './tree-client';

export const dynamic = 'force-dynamic';

export default async function TreePage({ params }: { params: { id: string } }) {
  const s = requireSession();
  await ensureSchema();
  const id = params.id;

  const info = await sql`select t.id, t.name from trees t join tree_members m on m.tree_id = t.id and m.user_id = ${s.userId} where t.id = ${id} limit 1`;
  if (info.rowCount === 0) {
    return <div className="card">You do not have access to this tree. <Link className="text-indigo-700" href="/dashboard">Back</Link></div>;
  }
  const tree = info.rows[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{tree.id}</div>
        <div className="text-xl font-semibold">{tree.name}</div>
        <div className="ml-auto"><Link className="text-sm text-slate-600 hover:underline" href="/dashboard">← Back</Link></div>
      </div>
      <TreeClient treeId={tree.id} />
    </div>
  );
}
