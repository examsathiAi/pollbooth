"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BTN, BTN_DANGER, CARD, ConfirmDialog, INPUT, Notice, PageHeader, Pager, SearchBox, Spinner, Tabs, errText, fmtDate, useDebounced } from "@/components/ui";

export function UserManagement() {
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dlg, setDlg] = useState<{ m: any; kind: "ban" | "unban" } | null>(null);
  const [banKind, setBanKind] = useState("COMMENTS");
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState("");
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/members", { params: { status, q: dq, page, limit: 20 } });
      setRows(res.data.members || []);
      setCounts(res.data.counts || {});
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load members.") });
    } finally {
      setLoading(false);
    }
  }, [status, dq, page]);

  useEffect(() => { load(); }, [load]);

  const open = (m: any, kind: "ban" | "unban") => {
    setDlg({ m, kind });
    setBanKind("COMMENTS");
    setDays(7);
    setReason("");
    setFormErr("");
  };

  const run = async () => {
    if (!dlg) return;
    if (dlg.kind === "ban" && reason.trim().length < 3) { setFormErr("Please write a short reason (at least 3 characters)."); return; }
    setBusy(true);
    try {
      if (dlg.kind === "ban") {
        await api.post(`/api/v1/admin/members/${dlg.m.id}/ban`, { kind: banKind, days: banKind === "COMMENTS" ? days : undefined, reason: reason.trim() });
      } else {
        await api.post(`/api/v1/admin/members/${dlg.m.id}/unban`, { reason: reason.trim() || undefined });
      }
      setNotice({ kind: "ok", text: "Done and recorded in the activity log." });
      setDlg(null);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That action failed. Nothing was changed.") });
      setDlg(null);
    } finally {
      setBusy(false);
    }
  };

  const restricted = (m: any) => m.is_banned || (m.comment_banned_until && new Date(m.comment_banned_until) > new Date());

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Members" title="Everyone on the platform" hint="Search members, see how active they are, and restrict or restore accounts. Emails and phone numbers are partly hidden to protect privacy." />
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}

      <div className={CARD + " space-y-4 p-4"}>
        <Tabs
          active={status}
          onChange={(s) => { setStatus(s); setPage(1); }}
          items={[
            { id: "ALL", label: "All members", count: counts.ALL },
            { id: "ACTIVE", label: "Not banned", count: counts.ACTIVE },
            { id: "WARNED", label: "Warned or restricted", count: counts.WARNED },
            { id: "BANNED", label: "Banned", count: counts.BANNED },
          ]}
        />
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, username, email or city" />

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No members match.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <article key={m.id} className="flex flex-col gap-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1f1b18]">
                    {m.name || m.username || "Member"}
                    {m.role !== "USER" ? <span className="ml-2 rounded-full bg-[#7a1f10] px-2 py-0.5 text-[10px] font-bold text-white">{m.role.replace("_", " ")}</span> : null}
                    {m.is_banned ? <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Banned</span> : null}
                    {!m.is_banned && m.comment_banned_until && new Date(m.comment_banned_until) > new Date() ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">No comments until {fmtDate(m.comment_banned_until)}</span> : null}
                  </p>
                  <p className="text-xs text-[#625a50]">@{m.username || "-"} {"•"} {m.email || m.phone || "no contact on file"} {"•"} {[m.city, m.state].filter(Boolean).join(", ") || "location unknown"}</p>
                  <p className="mt-1 text-xs text-[#625a50]">{m.votes} votes {"•"} {m.comments} comments {"•"} {m.warnings} warnings {"•"} joined {fmtDate(m.created_at)} {"•"} last active {fmtDate(m.last_active_at)}</p>
                  {m.is_banned && m.ban_reason ? <p className="mt-1 text-xs text-rose-700">Reason: {m.ban_reason}</p> : null}
                </div>
                <div className="flex gap-2">
                  {m.role === "USER" ? (
                    restricted(m)
                      ? <button type="button" className={BTN} onClick={() => open(m, "unban")}>Restore</button>
                      : <button type="button" className={BTN_DANGER} onClick={() => open(m, "ban")}>Restrict</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {dlg ? (
        <ConfirmDialog
          title={dlg.kind === "ban" ? "Restrict this member" : "Remove all restrictions?"}
          body={dlg.kind === "ban" ? `${dlg.m.name || dlg.m.username || "This member"} will be restricted as chosen below.` : `${dlg.m.name || dlg.m.username || "This member"} can vote and comment again.`}
          confirmLabel={dlg.kind === "ban" ? "Restrict" : "Restore access"}
          danger={dlg.kind === "ban"}
          busy={busy}
          onCancel={() => setDlg(null)}
          onConfirm={run}
        >
          {dlg.kind === "ban" ? (
            <div className="space-y-3">
              <label className="block text-sm"><span className="mb-1 block font-medium">What to restrict</span>
                <select value={banKind} onChange={(e) => setBanKind(e.target.value)} className={INPUT}>
                  <option value="COMMENTS">Comments only (they can still vote)</option>
                  <option value="ACCOUNT">Whole account (they are signed out)</option>
                </select>
              </label>
              {banKind === "COMMENTS" ? (
                <label className="block text-sm"><span className="mb-1 block font-medium">For how long</span>
                  <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={INPUT}>
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Reason {dlg.kind === "ban" ? "(required)" : "(optional)"}</span>
            <input value={reason} onChange={(e) => { setReason(e.target.value); setFormErr(""); }} maxLength={300} className={INPUT} />
          </label>
          {formErr ? <p className="mt-2 text-sm text-rose-600">{formErr}</p> : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
