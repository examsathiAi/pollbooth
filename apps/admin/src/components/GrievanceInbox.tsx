"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BTN, BTN_DANGER, BTN_PRIMARY, CARD, ConfirmDialog, INPUT, Notice, PageHeader, Pager, SearchBox, Spinner, Tabs, errText, fmtDate, useDebounced } from "@/components/ui";

const KIND: Record<string, string> = {
  COMPLAINT: "Complaint",
  CONTENT_REPORT: "Content report",
  ACCESS: "Wants to see their data",
  CORRECTION: "Wants data corrected",
  CONSENT_WITHDRAWAL: "Withdraws consent",
  ERASURE: "Wants account deleted",
};

export function GrievanceInbox() {
  const [tab, setTab] = useState("OPEN");
  const [kind, setKind] = useState("ALL");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [dlg, setDlg] = useState<{ g: any; action: "RESOLVE" | "REJECT" } | null>(null);
  const [note, setNote] = useState("");
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/grievances", { params: { tab, kind, q: dq, page, limit: 20 } });
      setRows(res.data.items || []);
      setCounts(res.data.counts || {});
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load requests.") });
    } finally {
      setLoading(false);
    }
  }, [tab, kind, dq, page]);

  useEffect(() => { load(); }, [load]);

  const send = async (id: string, action: string, text?: string) => {
    setBusy(true);
    try {
      const res = await api.patch(`/api/v1/admin/grievances/${id}`, { action, note: text });
      setNotice({ kind: "ok", text: res.data?.message || "Done." });
      setDlg(null);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That failed. Nothing was changed.") });
      setDlg(null);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!dlg) return;
    if (note.trim().length < 5) { setFormErr("Please write what was done (at least 5 characters)."); return; }
    send(dlg.g.id, dlg.action, note.trim());
  };

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Compliance" title="Grievances and data requests" hint="Everything people send from the Grievance page lands here. Acknowledge within 24 hours and close within 15 days. Reply to the person on the contact shown, then record what you did." />
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}

      <div className={CARD + " space-y-4 p-4"}>
        <Tabs
          active={tab}
          onChange={(t) => { setTab(t); setPage(1); }}
          items={[
            { id: "OPEN", label: "Open", count: counts.OPEN },
            { id: "NEW", label: "Not acknowledged", count: counts.NEW },
            { id: "OVERDUE", label: "Overdue", count: counts.OVERDUE },
            { id: "CLOSED", label: "Closed", count: counts.CLOSED },
            { id: "ALL", label: "All", count: counts.ALL },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search reference, name, contact or text" />
          <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className={INPUT + " sm:max-w-xs"}>
            <option value="ALL">All types</option>
            {Object.entries(KIND).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">Nothing here.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((g) => (
              <article key={g.id} className="space-y-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#1f1b18]">{g.ref}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#7a1f10]">{KIND[g.kind] || g.kind}</span>
                  {g.status === "NEW" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Not acknowledged</span> : null}
                  {g.status === "IN_PROGRESS" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">Acknowledged</span> : null}
                  {g.status === "RESOLVED" ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Resolved</span> : null}
                  {g.status === "REJECTED" ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">Rejected</span> : null}
                  {g.overdue ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Overdue</span> : null}
                  {g.signed_in ? <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#625a50]">Signed-in member</span> : null}
                </div>
                <p className="text-xs text-[#625a50]">{g.name} {"•"} {g.contact} {"•"} received {fmtDate(g.created_at)} {"•"} due {fmtDate(g.due_at)}</p>
                <p className="whitespace-pre-wrap text-sm text-[#1f1b18]">{g.message}</p>
                {g.resolution ? <p className="rounded-xl bg-white p-3 text-xs text-[#625a50]"><span className="font-semibold">What was done:</span> {g.resolution} ({fmtDate(g.resolved_at)})</p> : null}
                {g.status === "NEW" || g.status === "IN_PROGRESS" ? (
                  <div className="flex flex-wrap gap-2">
                    {g.status === "NEW" ? <button type="button" className={BTN} onClick={() => send(g.id, "ACKNOWLEDGE")} disabled={busy}>Mark acknowledged</button> : null}
                    <button type="button" className={BTN_PRIMARY} onClick={() => { setDlg({ g, action: "RESOLVE" }); setNote(""); setFormErr(""); }}>Close as resolved</button>
                    <button type="button" className={BTN_DANGER} onClick={() => { setDlg({ g, action: "REJECT" }); setNote(""); setFormErr(""); }}>Reject</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {dlg ? (
        <ConfirmDialog
          title={dlg.action === "RESOLVE" ? "Close as resolved" : "Reject this request"}
          body={dlg.action === "RESOLVE" ? `Record what was done for ${dlg.g.ref}.` : `Explain why ${dlg.g.ref} cannot be taken forward.`}
          confirmLabel={dlg.action === "RESOLVE" ? "Close request" : "Reject"}
          danger={dlg.action === "REJECT"}
          busy={busy}
          onCancel={() => setDlg(null)}
          onConfirm={close}
        >
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">What was done (required)</span>
            <textarea value={note} onChange={(e) => { setNote(e.target.value); setFormErr(""); }} rows={4} maxLength={2000} className={INPUT} />
          </label>
          {formErr ? <p className="mt-2 text-sm text-rose-600">{formErr}</p> : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
