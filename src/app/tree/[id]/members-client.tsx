// src/app/tree/[id]/members-client.tsx
// Client component for managing tree members. This component lists existing
// members with their roles and allows an admin to invite new members by
// entering their email address and selecting a role. Admins can also remove
// members. This uses the `/api/trees/[id]/members` API to fetch and mutate
// memberships. Only admins can access this component; the API will return an
// error for non-admins.

'use client';

import React, { useEffect, useState } from 'react';

export default function MembersClient({ treeId }: { treeId: string }) {
  const [members, setMembers] = useState<Array<{ id: string; email: string; role: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setError(null);
      const r = await fetch(`/api/trees/${treeId}/members`);
      if (!r.ok) throw new Error((await r.json()).error || 'Failed to fetch');
      const j = await r.json();
      setMembers(j);
    } catch (e: any) {
      setError(e.message);
      setMembers(null);
    }
  }
  useEffect(() => {
    load();
  }, [treeId]);

  async function invite() {
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      setLoading(true);
      const r = await fetch(`/api/trees/${treeId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed');
      setInviteEmail('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove(userId: string) {
    try {
      setLoading(true);
      const r = await fetch(`/api/trees/${treeId}/members?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Members</h3>
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        {!members && !error && <div className="text-xs text-slate-400">Loading…</div>}
        {members && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1">Email</th>
                <th className="py-1">Role</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-[#574CDC]/20">
                  <td className="py-1">{m.email}</td>
                  <td className="py-1 capitalize">{m.role}</td>
                  <td className="py-1 text-right">
                    {/* Owners cannot remove themselves */}
                    {m.role !== 'owner' && (
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => remove(m.id)}
                        disabled={loading}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Invite Member</h4>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={loading}
          />
          <select
            className="input w-32"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            disabled={loading}
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn" onClick={invite} disabled={loading}>
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}