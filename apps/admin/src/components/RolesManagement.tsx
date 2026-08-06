"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCog } from "lucide-react";
import { api } from "@/lib/api";

interface UserRoleItem {
  id: string;
  username?: string | null;
  role: string;
  email?: string | null;
}

export function RolesManagement() {
  const [users, setUsers] = useState<UserRoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await api.get<{ users: UserRoleItem[] }>('/api/v1/admin/roles');
      setUsers(res.data.users || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (userId: string, role: string) => {
    try {
      await api.patch(`/api/v1/admin/roles/${userId}`, { role });
      setMessage(`Updated role to ${role}`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update role");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Roles</p>
          <h2 className="text-xl font-semibold text-white">Manage moderator and administrator access</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Super admin only</div>
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">Loading users…</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-violet-400" />
                    <h3 className="font-semibold text-white">{user.username || "Unnamed user"}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{user.email || "No email on record"}</p>
                </div>
                <select
                  value={user.role}
                  onChange={(event) => updateRole(user.id, event.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
