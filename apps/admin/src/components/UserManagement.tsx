"use client";

import { useEffect, useState } from "react";
import { Shield, Search, Loader2, UserX, Activity, Ban } from "lucide-react";
import { api } from "@/lib/api";

interface PlatformUser {
  id: string;
  phone_number?: string;
  state?: string;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
  stats: { votes: number; opinions: number };
}

export function UserManagement() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/v1/admin/users", { params: { search: searchQuery, limit: 50 } });
        setUsers(res.data.users || []);
      } catch (err: any) {
        setError("Failed to load user database");
      } finally {
        setIsLoading(false);
      }
    };
    // Fetch immediately on load, and setup debounce for search
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleBanUser = async (id: string) => {
    if (!confirm("Are you sure you want to ban this user?")) return;
    try {
      await api.post("/api/v1/moderation/users/" + id + "/ban", { reason: "Admin dashboard intervention" });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: true } : u));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to ban user. Check payload schema.");
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Community Directory & Governance</h2>
          <p className="mt-1 text-sm text-slate-500">Reflecting 100% real database metrics. Showing verified user engagement and ban status.</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by phone or username..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 text-xs font-medium text-slate-500">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">Loaded: {users.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">User Identity</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Real Engagement</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.phone_number || "Hidden (Privacy)"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {user.id.substring(0, 12)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {user.state || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 font-semibold">
                        <span className="text-indigo-600">{user.stats?.votes ?? 0}</span> Votes • <span className="text-emerald-600">{user.stats?.opinions ?? 0}</span> Opinions
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-1 rounded">
                          <UserX className="h-3 w-3" /> Banned
                        </span>
                      ) : !user.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-2 py-1 rounded">
                          <Shield className="h-3 w-3" /> Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          <Activity className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleBanUser(user.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Ban / Suspend"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}