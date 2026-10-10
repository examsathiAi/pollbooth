"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Flag, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { BTN, BTN_DANGER, CARD, ConfirmDialog, INPUT, Notice, PageHeader, Pager, SearchBox, Spinner, Tabs, errText, fmtDate, useDebounced } from "@/components/ui";

function CommentsInbox({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState("REPORTED");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ c: any; action: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/comments", { params: { status, q: dq, page, limit: 15 } });
      setRows(res.data.comments || []);
      setCounts(res.data.counts || {});
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load comments.") });
    } finally {
      setLoading(false);
    }
  }, [status, dq, page]);

  useEffect(() => { load(); }, [load]);

  const COPY: Record<string, { title: string; body: string; label: string; danger?: boolean }> = {
    APPROVE: { title: "Keep this comment visible?", body: "It will be shown on the poll and its reports are closed.", label: "Keep comment" },
    REJECT: { title: "Remove this comment?", body: "It is hidden from everyone. The writer also receives an automatic warning, and repeated violations lead to a comment ban.", label: "Remove comment", danger: true },
    WARN_USER: { title: "Warn the writer only?", body: "The comment stays as it is. The writer gets a warning on record.", label: "Send warning" },
  };

  const run = async (reason: string) => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.post(`/api/v1/admin/comments/${confirm.c.id}/action`, { action: confirm.action, reason: reason || undefined });
      setNotice({ kind: "ok", text: "Done and recorded in the activity log." });
      setConfirm(null);
      await load();
      onChanged();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That action failed. Nothing was changed.") });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={CARD + " space-y-4 p-4"}>
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}
      <Tabs
        active={status}
        onChange={(s) => { setStatus(s); setPage(1); }}
        items={[
          { id: "REPORTED", label: "Reported", count: counts.REPORTED },
          { id: "HIDDEN", label: "Hidden", count: counts.HIDDEN },
          { id: "VISIBLE", label: "Visible", count: counts.VISIBLE },
          { id: "ALL", label: "All comments", count: counts.ALL },
        ]}
      />
      <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search comment text or username" />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">
          <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-300" />
          Nothing here{dq ? " for this search" : status === "REPORTED" ? ". No reported comments waiting." : "."}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <article key={c.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#625a50]">
                <span className="font-semibold text-[#1f1b18]">@{c.user?.username || "member"}</span>
                {c.user?.city ? <span>{c.user.city}</span> : null}
                <span>{fmtDate(c.created_at)}</span>
                {c.is_hidden ? <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-700">Hidden</span> : null}
                {c.report_reasons.length > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-700"><Flag className="h-3 w-3" /> {c.report_reasons.length} report{c.report_reasons.length === 1 ? "" : "s"}</span> : null}
              </div>
              <p className="mt-2 text-sm text-[#1f1b18]">&ldquo;{c.content}&rdquo;</p>
              {c.poll?.question ? <p className="mt-2 text-xs text-[#625a50]">On poll: {c.poll.question}</p> : null}
              {c.report_reasons.length > 0 ? <p className="mt-2 border-l-2 border-rose-300 pl-2 text-xs text-rose-700">Reasons: {c.report_reasons.join(" \u2022 ")}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={BTN} onClick={() => setConfirm({ c, action: "APPROVE" })}>Keep</button>
                <button type="button" className={BTN_DANGER} onClick={() => setConfirm({ c, action: "REJECT" })}>Remove</button>
                <button type="button" className={BTN} onClick={() => setConfirm({ c, action: "WARN_USER" })}>Warn only</button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      {confirm ? (
        <ConfirmDialog title={COPY[confirm.action].title} body={COPY[confirm.action].body} confirmLabel={COPY[confirm.action].label} danger={COPY[confirm.action].danger} askReason busy={busy} onCancel={() => setConfirm(null)} onConfirm={run}>
          <p className="rounded-xl bg-[#f4efe7] p-3 text-sm text-[#1f1b18]">&ldquo;{confirm.c.content}&rdquo;</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function CivicInbox({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState("PENDING");
  const [city, setCity] = useState("");
  const dcity = useDebounced(city);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [convert, setConvert] = useState<any | null>(null);
  const [cq, setCq] = useState("");
  const [copts, setCopts] = useState("Yes\nNo");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/civic/issues", { params: { status, city: dcity || undefined, limit: 50 } });
      const list = res.data?.issues || (Array.isArray(res.data) ? res.data : []);
      setRows(list);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load civic issues.") });
    } finally {
      setLoading(false);
    }
  }, [status, dcity]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, what: "approve" | "reject") => {
    setBusyId(id);
    try {
      await api.patch(`/api/v1/civic/issues/${id}/${what}`);
      setNotice({ kind: "ok", text: what === "approve" ? "Issue approved." : "Issue rejected." });
      await load();
      onChanged();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That action failed.") });
    } finally {
      setBusyId(null);
    }
  };

  const doConvert = async () => {
    if (!convert) return;
    const options = copts.split("\n").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) { setNotice({ kind: "err", text: "Add at least two options, one per line." }); return; }
    setBusyId(convert.id);
    try {
      await api.post(`/api/v1/civic/issues/${convert.id}/convert`, { question: cq.trim() || undefined, options });
      setNotice({ kind: "ok", text: "A poll was created from this issue. Find it under Polls \u2192 Review." });
      setConvert(null);
      await load();
      onChanged();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not create the poll.") });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={CARD + " space-y-4 p-4"}>
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT + " sm:max-w-[200px]"}>
          <option value="PENDING">Waiting for review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <SearchBox value={city} onChange={setCity} placeholder="Filter by city" />
      </div>
      {loading ? <Spinner /> : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No civic issues here.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <article key={i.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <h4 className="font-semibold text-[#1f1b18]">{i.title}</h4>
              {i.description ? <p className="mt-1 text-sm text-[#625a50]">{i.description}</p> : null}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-[#625a50]">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[i.city, i.state].filter(Boolean).join(", ")}</span>
                <span>{String(i.category || "").replace("_", " ")}</span>
                <span>{fmtDate(i.created_at)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {i.status === "PENDING" ? (
                  <>
                    <button type="button" className={BTN} disabled={busyId === i.id} onClick={() => decide(i.id, "approve")}>Approve</button>
                    <button type="button" className={BTN_DANGER} disabled={busyId === i.id} onClick={() => decide(i.id, "reject")}>Reject</button>
                  </>
                ) : null}
                {i.status !== "REJECTED" && !i.poll_id ? (
                  <button type="button" className={BTN} onClick={() => { setConvert(i); setCq(i.title || ""); setCopts("Yes\nNo"); }}>Turn into a poll</button>
                ) : null}
                {i.poll_id ? <span className="text-xs font-semibold text-emerald-700">Already a poll</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {convert ? (
        <ConfirmDialog title="Turn this issue into a poll" body="It is saved for review first; you approve it under Polls." confirmLabel="Create poll" busy={busyId === convert.id} onCancel={() => setConvert(null)} onConfirm={doConvert}>
          <label className="block text-sm"><span className="mb-1 block font-medium">Poll question</span>
            <textarea value={cq} onChange={(e) => setCq(e.target.value)} rows={2} className={INPUT} /></label>
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Options (one per line)</span>
            <textarea value={copts} onChange={(e) => setCopts(e.target.value)} rows={4} className={INPUT} /></label>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

export function ModerationInbox({ onChanged }: { onChanged?: () => void }) {
  const [tab, setTab] = useState("comments");
  const noop = () => { if (onChanged) onChanged(); };
  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Moderation" title="Comments, reports and civic issues" hint="Reported comments appear first. Every decision is saved in the activity log." />
      <Tabs active={tab} onChange={setTab} items={[{ id: "comments", label: "Comments" }, { id: "civic", label: "Civic issues" }]} />
      {tab === "comments" ? <CommentsInbox onChanged={noop} /> : <CivicInbox onChanged={noop} />}
    </section>
  );
}
