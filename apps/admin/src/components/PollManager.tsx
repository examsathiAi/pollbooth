"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, ExternalLink, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { PollEditor } from "@/components/PollEditor";
import { BTN, BTN_DANGER, CARD, ConfirmDialog, INPUT, Notice, PageHeader, Pager, SearchBox, Spinner, Tabs, errText, fmtDate, useDebounced } from "@/components/ui";

const CATEGORIES = [
  "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS", "LOCAL",
  "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH", "FOOD", "TRAVEL",
  "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS", "WORK_CULTURE", "ENVIRONMENT", "OTHER",
];

interface Row {
  id: string; question: string; category: string; status: string; is_active: boolean;
  end_date: string | null; created_at: string; image_url: string | null; votes: number; opinions: number;
}

const COPY: Record<string, { title: string; body: string; label: string; danger?: boolean }> = {
  APPROVE: { title: "Approve and publish?", body: "The poll goes live on the platform immediately.", label: "Approve" },
  REJECT: { title: "Reject this poll?", body: "It will be removed from the review queue and will not go live.", label: "Reject", danger: true },
  CLOSE: { title: "Stop this poll?", body: "Voting stops now. People can still see the results.", label: "Stop poll", danger: true },
  REOPEN: { title: "Restart this poll?", body: "Voting opens again. Use Extend if you also want a new end date.", label: "Restart" },
  HIDE: { title: "Hide from the platform?", body: "Nobody can see this poll until you unhide it. Votes are kept.", label: "Hide poll", danger: true },
  UNHIDE: { title: "Show on the platform again?", body: "The poll becomes visible to everyone.", label: "Unhide" },
  EXTEND: { title: "Extend the end date", body: "Pick how long from now the poll should run. It will also be set to live.", label: "Extend" },
};

function actionsFor(p: Row): string[] {
  if (p.status === "PENDING_REVIEW") return ["APPROVE", "REJECT"];
  if (p.status !== "ACTIVE" && p.status !== "CLOSED") return [];
  if (!p.is_active) return ["UNHIDE"];
  if (p.status === "ACTIVE") return ["EXTEND", "CLOSE", "HIDE"];
  return ["REOPEN", "HIDE"];
}

function statusChip(p: Row) {
  if (p.status === "PENDING_REVIEW") return { t: "Needs review", c: "bg-amber-100 text-amber-800" };
  if (!p.is_active && (p.status === "ACTIVE" || p.status === "CLOSED")) return { t: "Hidden", c: "bg-slate-200 text-slate-700" };
  if (p.status === "ACTIVE") return { t: "Live", c: "bg-emerald-100 text-emerald-800" };
  if (p.status === "CLOSED") return { t: "Stopped", c: "bg-orange-100 text-orange-800" };
  return { t: p.status.replace("_", " "), c: "bg-slate-200 text-slate-700" };
}

export function PollManager() {
  const [tab, setTab] = useState("REVIEW");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ poll: Row; action: string } | null>(null);
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/polls/manage", { params: { tab, q: dq, category, page, limit: 15 } });
      setRows(res.data.polls || []);
      setCounts(res.data.counts || {});
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load polls.") });
    } finally {
      setLoading(false);
    }
  }, [tab, dq, category, page]);

  useEffect(() => { load(); }, [load]);

  const run = async (reason: string) => {
    if (!confirm) return;
    const { poll, action } = confirm;
    setBusy(true);
    try {
      if (action === "APPROVE") await api.post(`/api/v1/polls/${poll.id}/approve`);
      else if (action === "REJECT") await api.post(`/api/v1/polls/${poll.id}/reject`);
      else {
        const body: any = { action, reason };
        if (action === "EXTEND") body.endDate = new Date(Date.now() + days * 86400000).toISOString();
        await api.patch(`/api/v1/admin/polls/${poll.id}/lifecycle`, body);
      }
      setNotice({ kind: "ok", text: "Done. The change is saved and recorded in the activity log." });
      setConfirm(null);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That action failed. Nothing was changed.") });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const cfg = confirm ? COPY[confirm.action] : null;

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Polls" title="Review, edit and control every poll" hint="New polls wait in Review until you approve them. Live polls can be edited, extended, stopped, restarted or hidden." />

      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}

      <div className={CARD + " space-y-4 p-4"}>
        <Tabs
          active={tab}
          onChange={(t) => { setTab(t); setPage(1); }}
          items={[
            { id: "REVIEW", label: "Review", count: counts.REVIEW },
            { id: "LIVE", label: "Live", count: counts.LIVE },
            { id: "CLOSED", label: "Stopped", count: counts.CLOSED },
            { id: "HIDDEN", label: "Hidden", count: counts.HIDDEN },
            { id: "ALL", label: "All", count: counts.ALL },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search poll question" />
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={INPUT + " sm:max-w-[200px]"}>
            <option value="ALL">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
          </select>
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No polls here{dq || category !== "ALL" ? " for these filters" : " yet"}.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((p) => {
              const chip = statusChip(p);
              return (
                <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4 md:flex-row md:items-center">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-[#d8ceb8] bg-white">
                    {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-[#625a50]"><EyeOff className="mr-1 h-3 w-3" />No image</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1f1b18]">{p.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#625a50]">
                      <span className={`rounded-full px-2 py-0.5 font-bold ${chip.c}`}>{chip.t}</span>
                      <span>{p.category.replace("_", " ")}</span>
                      <span>{p.votes} votes</span>
                      <span>{p.opinions} comments</span>
                      <span>Ends {fmtDate(p.end_date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BTN} onClick={() => setEditId(p.id)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    {p.status === "ACTIVE" || p.status === "CLOSED" ? (
                      <a className={BTN} href={`https://pollbooth.in/poll/${p.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> View</a>
                    ) : null}
                    {actionsFor(p).map((a) => (
                      <button key={a} type="button" onClick={() => { setDays(3); setConfirm({ poll: p, action: a }); }} className={COPY[a].danger ? BTN_DANGER : BTN}>
                        {a === "CLOSE" ? "Stop" : a === "REOPEN" ? "Restart" : a.charAt(0) + a.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {confirm && cfg ? (
        <ConfirmDialog
          title={cfg.title}
          body={cfg.body}
          confirmLabel={cfg.label}
          danger={cfg.danger}
          askReason={confirm.action !== "APPROVE" && confirm.action !== "REJECT"}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={run}
        >
          <p className="mb-3 rounded-xl bg-[#f4efe7] p-3 text-sm text-[#1f1b18]">{confirm.poll.question}</p>
          {confirm.action === "EXTEND" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Run for another</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={INPUT}>
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
          ) : null}
        </ConfirmDialog>
      ) : null}

      {editId ? (
        <PollEditor
          id={editId}
          onClose={() => setEditId(null)}
          onSaved={(text) => { setEditId(null); setNotice({ kind: "ok", text }); load(); }}
        />
      ) : null}
    </section>
  );
}
