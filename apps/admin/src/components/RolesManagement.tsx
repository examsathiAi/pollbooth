"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Key, UserPlus, Trash2, History, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface StaffMember {
  id: string;
  phone?: string;
  role: string;
}

const AVAILABLE_ROLES = [
  { id: "MODERATOR", label: "Moderator", desc: "Can manage civic issues and content flags." },
  { id: "ADMIN", label: "Administrator", desc: "Can manage polls, surveys, and standard users." },
  { id: "SUPER_ADMIN", label: "Super Admin", desc: "Full system access, including billing and roles." },
];

export function RolesManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("MODERATOR");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchStaffRoles = async () => {
      try {
        const res = await api.get("/api/v1/admin/roles");
        setStaff(res.data?.users || []);
      } catch (err: any) {
        setError("Failed to load role assignments.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaffRoles();
  }, []);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePhone.trim()) return;
    
    setIsProcessing(true);
    try {
      const userRes = await api.get("/api/v1/admin/users", { params: { search: invitePhone, limit: 1 } });
      const user = userRes.data?.users?.[0] || (Array.isArray(userRes.data) ? userRes.data[0] : null);
      
      if (!user) {
        throw new Error("User not found on platform. They must register first.");
      }
      
      await api.patch("/api/v1/admin/roles/" + user.id, { role: inviteRole });
      
      setStaff(prev => [...prev, { id: user.id, phone: invitePhone, role: inviteRole }]);
      setInvitePhone("");
      alert("Successfully provisioned access.");
    } catch (err: any) {
      alert(err.message || "Failed to grant access.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeAccess = async (id: string) => {
    if (!confirm("Are you sure you want to completely revoke admin access for this user?")) return;
    try {
      await api.patch("/api/v1/admin/roles/" + id, { role: "USER" });
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to revoke access.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Enterprise Access & Roles</h2>
          <p className="mt-1 text-sm text-slate-500">Manage zero-trust staff permissions, invite team members, and audit system actions.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <Key className="h-4 w-4"/> RBAC Enforced
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <UserPlus className="h-5 w-5 text-indigo-600" /> Provision Staff Access
            </h3>
            <form onSubmit={handleGrantAccess} className="flex flex-col sm:flex-row gap-3">
              <input type="text" placeholder="User Phone Number" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} required className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500" />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500">
                {AVAILABLE_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <button type="submit" disabled={isProcessing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grant Access"}
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 p-5 bg-slate-50/50">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> Active System Administrators
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {staff.length > 0 ? staff.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-900">{member.phone || "Hidden"}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {member.id}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">{member.role.replace('_', ' ')}</span>
                    <button onClick={() => handleRevokeAccess(member.id)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )) : <div className="p-8 text-center text-sm text-slate-500">No elevated roles found.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}