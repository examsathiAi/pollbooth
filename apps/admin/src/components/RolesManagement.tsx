"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { BTN_DANGER, BTN_PRIMARY, CARD, ConfirmDialog, INPUT, Notice, PageHeader, SearchBox, Spinner, errText, fmtDate } from "@/components/ui";

const ROLES = [
  { id: "MODERATOR", label: "Moderator", desc: "Reviews comments, reports and civic issues." },
  { id: "ADMIN", label: "Admin", desc: "Everything a Moderator does, plus create, edit, approve and control polls, and view members." },
  { id: "SUPER_ADMIN", label: "Super Admin", desc: "Full control, including the team, activity log, compliance and system health." },
];

const roleLabel = (r: string) => ROLES.find((x) => x.id === r)?.label || r;

export function RolesManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("MODERATOR");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ m: any; kind: "role" | "remove"; role?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/admin/team");
      setTeam(res.data.team || []);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load the team.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await api.post("/api/v1/admin/team/add", { email: email.trim(), role: newRole });
      setNotice({ kind: "ok", text: "Added to the team. They can sign in at admin.pollbooth.in with their email." });
      setEmail("");
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not add this person.") });
    } finally {
      setAdding(false);
    }
  };

  const run = async (reason: string) => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "role") await api.patch(`/api/v1/admin/team/${confirm.m.id}`, { role: confirm.role, reason: reason || undefined });
      else await api.post(`/api/v1/admin/team/${confirm.m.id}/remove`, { reason: reason || undefined });
      setNotice({ kind: "ok", text: "Done. It is recorded in the activity log and takes effect immediately." });
      setConfirm(null);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That change failed. Nothing was changed.") });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const shown = team.filter((m) => {
    if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
    const hay = `${m.username || ""} ${m.name || ""} ${m.email || ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Team & roles" title="Who can run PollBooth" hint="Add employees by email, change what they can do, or remove their access in one click." />
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}

      <div className={CARD + " p-5"}>
        <h3 className="flex items-center gap-2 text-base font-semibold"><UserPlus className="h-4 w-4 text-[#7a1f10]" /> Add a team member</h3>
        <p className="mt-1 text-xs text-[#625a50]">They must first sign up on pollbooth.in with the same email. Then add them here and choose a role.</p>
        <form onSubmit={add} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@example.com" className={INPUT} />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={INPUT + " sm:max-w-[180px]"}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button type="submit" disabled={adding} className={BTN_PRIMARY + " whitespace-nowrap"}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Add to team
          </button>
        </form>
        <ul className="mt-4 space-y-1 text-xs text-[#625a50]">
          {ROLES.map((r) => <li key={r.id}><span className="font-semibold text-[#1f1b18]">{r.label}:</span> {r.desc}</li>)}
        </ul>
      </div>

      <div className={CARD + " space-y-4 p-4"}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox value={q} onChange={setQ} placeholder="Search name or email" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={INPUT + " sm:max-w-[200px]"}>
            <option value="ALL">All roles</option>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No team members match.</div>
        ) : (
          <div className="space-y-3">
            {shown.map((m) => (
              <article key={m.id} className="flex flex-col gap-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1f1b18]">{m.name || m.username || "Staff member"}{m.is_you ? <span className="ml-2 rounded-full bg-[#7a1f10] px-2 py-0.5 text-[10px] font-bold text-white">You</span> : null}</p>
                  <p className="text-xs text-[#625a50]">{m.email || "No email on this account"}</p>
                  <p className="mt-1 text-xs text-[#625a50]">Last active {fmtDate(m.last_active_at)}{!m.is_active ? " \u2022 Inactive" : ""}{m.is_banned ? " \u2022 Banned" : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={m.role}
                    disabled={m.is_you}
                    onChange={(e) => setConfirm({ m, kind: "role", role: e.target.value })}
                    className={INPUT + " w-auto"}
                  >
                    {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  {!m.is_you ? <button type="button" className={BTN_DANGER} onClick={() => setConfirm({ m, kind: "remove" })}>Remove access</button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {confirm ? (
        <ConfirmDialog
          title={confirm.kind === "role" ? `Change role to ${roleLabel(confirm.role || "")}?` : "Remove staff access?"}
          body={confirm.kind === "role" ? `${confirm.m.name || confirm.m.username || "This person"} will be ${roleLabel(confirm.role || "")} from their next click.` : `${confirm.m.name || confirm.m.username || "This person"} becomes an ordinary member and loses all admin access immediately.`}
          confirmLabel={confirm.kind === "role" ? "Change role" : "Remove access"}
          danger={confirm.kind === "remove"}
          askReason
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={run}
        />
      ) : null}
    </section>
  );
}
