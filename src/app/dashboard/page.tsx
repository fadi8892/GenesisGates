import Link from 'next/link';
import { requireSession } from '@/lib/auth';
import { sql, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const s = requireSession();
  await ensureSchema();

  const { rows } = await sql`
    select t.id, t.name, t.created_at, m.role
    from trees t join tree_members m on m.tree_id = t.id
    where m.user_id = ${s.userId}
    order by t.created_at desc
  `;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-2">
          <form action="/api/trees" method="post" className="flex gap-2 w-full">
            <input className="input w-full" name="name" placeholder="New tree name…" />
            <button className="btn" type="submit">Create Tree</button>
          </form>
        </div>
      </div>
      <div className="card">
        <div className="text-sm font-semibold mb-2">Your Trees</div>
        <div className="divide-y">
          {rows.map((r: any) => (
            <div key={r.id} className="py-3 flex items-center">
              <div className="font-mono w-28">{r.id}</div>
              <div className="flex-1">{r.name}</div>
              <div className="badge mr-2">{r.role}</div>
              <Link className="text-indigo-700 hover:underline" href={`/tree/${r.id}`}>Open</Link>
            </div>
          ))}
          {rows.length === 0 && <div className="text-slate-500 text-sm">No trees yet.</div>}
        </div>
      </div>
    </div>
  );
}
