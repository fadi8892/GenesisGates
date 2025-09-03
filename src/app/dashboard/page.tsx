import { requireSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // Ensure the user is signed in; if not, bounce to home.
  let session: { userId: string; email: string };
  try {
    session = requireSession();
  } catch {
    redirect('/');
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-slate-600">Welcome, <span className="font-mono">{session.email}</span>.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-medium mb-2">Get Started</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
            <li>Create your first Family Tree ID.</li>
            <li>Invite editors by email (coming next).</li>
            <li>Optionally publish a snapshot to IPFS.</li>
          </ol>
        </div>
        <div className="card">
          <h2 className="font-medium mb-2">Next Steps</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            <li>Set up storage billing.</li>
            <li>Configure location auto-fill & date formats.</li>
            <li>Manage permissions for your Family ID.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
