"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api";

interface UserItem {
  id: string;
  username?: string | null;
  phone_number?: string | null;
  city?: string | null;
  state?: string | null;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  stats: { votes: number; opinions: number };
  profile?: { age_bracket?: string | null; gender?: string | null; completed_percentage?: number | null };
}

interface UserListResponse {
  users: UserItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async (search = query) => {
    setLoading(true);
    try {
      const res = await api.get<UserListResponse>("/api/v1/admin/users", { params: { search, page: 1, limit: 10 } });
      setUsers(res.data.users);
      setError(null);
    } catch (err: any) {
      setError(err.response?.status === 401 ? "Please log in as an admin" : err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => users.filter((user) => user.username?.toLowerCase().includes(query.toLowerCase()) || user.phone_number?.includes(query)), [query, users]);

  const toggleBan = async (userId: string) => {
    try {
      await api.post(`/api/v1/moderation/users/${userId}/ban`, { permanent: false, duration_days: 7, reason: "Admin action from dashboard" });
      setUsers((current) => current.map((user) => (user.id === userId ? { ...user, is_banned: !user.is_banned } : user)));
      setMessage("User state updated successfully.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update user state.");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">User management</p>
          <h2 className="text-xl font-semibold text-white">Community safety and account oversight</h2>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" className="bg-transparent text-sm text-slate-200 outline-none" />
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">Loading accounts…</div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <article key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{user.username || "Unnamed user"}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${user.is_banned ? "bg-rose-600/20 text-rose-300" : "bg-emerald-600/20 text-emerald-300"}`}>
                      {user.is_banned ? "Banned" : user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{user.phone_number || "No phone on record"} • {user.city || "Unknown city"}, {user.state || "Unknown state"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setExpandedId(expandedId === user.id ? null : user.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200">View profile</button>
                  <button onClick={() => toggleBan(user.id)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${user.is_banned ? "bg-emerald-600/90 text-white" : "bg-rose-600/90 text-white"}`}>
                    {user.is_banned ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                    {user.is_banned ? "Unban" : "Ban"}
                  </button>
                </div>
              </div>

              {expandedId === user.id && (
                <div className="mt-4 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Profile</p>
                    <p className="mt-2 text-sm text-slate-300">Age group: {user.profile?.age_bracket || "Unknown"}</p>
                    <p className="text-sm text-slate-300">Gender: {user.profile?.gender || "Unknown"}</p>
                    <p className="text-sm text-slate-300">Completion: {user.profile?.completed_percentage ?? 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Engagement</p>
                    <p className="mt-2 text-sm text-slate-300">Votes: {user.stats.votes}</p>
                    <p className="text-sm text-slate-300">Opinions: {user.stats.opinions}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Safety</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      <ShieldAlert className="h-4 w-4 text-amber-400" /> {user.is_banned ? "Restricted account" : "No restrictions"}
                    </p>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
