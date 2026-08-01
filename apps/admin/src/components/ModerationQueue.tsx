"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, UserX } from "lucide-react";
import { api } from "@/lib/api";

interface OpinionItem {
  id: string;
  content: string;
  report_count: number;
  created_at: string;
  moderation_status: string;
  user?: { username?: string | null; city?: string | null };
  poll?: { question?: string | null; category?: string | null };
}

interface QueueResponse {
  opinions: OpinionItem[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export function ModerationQueue() {
  const [items, setItems] = useState<OpinionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");

  const loadQueue = async (nextStatus = status) => {
    setLoading(true);
    try {
      const res = await api.get<QueueResponse>(`/api/v1/moderation/queue`, { params: { status: nextStatus, page: 1, limit: 10 } });
      setItems(res.data.opinions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(status);
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT" | "WARN_USER") => {
    try {
      await api.post(`/api/v1/moderation/${id}/moderate`, { action, reason: `${action} from admin dashboard` });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const summary = useMemo(() => ({ flagged: items.length, reports: items.reduce((sum, item) => sum + item.report_count, 0) }), [items]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Moderation queue</p>
          <h2 className="text-xl font-semibold text-white">Flagged opinions and report review</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          {summary.flagged} flagged · {summary.reports} reports
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(["ALL", "FLAGGED", "REJECTED", "APPROVED"] as const).map((value) => (
          <button
            key={value}
            onClick={() => {
              setStatus(value);
              loadQueue(value);
            }}
            className={`rounded-full px-3 py-1.5 text-sm ${status === value ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300"}`}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">Loading queue…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No flagged opinions found.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>{item.user?.username || "Anonymous"}</span>
                    <span>•</span>
                    <span>{item.user?.city || "Unknown city"}</span>
                  </div>
                  <p className="text-sm text-slate-200">{item.content}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-slate-700 px-2.5 py-1">Reports: {item.report_count}</span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1">Topic: {item.poll?.category || "General"}</span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1">Hint: {item.poll?.question ? "High engagement" : "Needs review"}</span>
                  </div>
                </div>
                <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  {item.moderation_status}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => handleAction(item.id, "APPROVE")} className="flex items-center gap-2 rounded-xl bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => handleAction(item.id, "REJECT")} className="flex items-center gap-2 rounded-xl bg-rose-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500">
                  <ShieldAlert className="h-4 w-4" /> Reject
                </button>
                <button onClick={() => handleAction(item.id, "WARN_USER")} className="flex items-center gap-2 rounded-xl bg-amber-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-500">
                  <AlertTriangle className="h-4 w-4" /> Warn
                </button>
                <button onClick={() => handleAction(item.id, "REJECT")} className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400 hover:text-rose-300">
                  <UserX className="h-4 w-4" /> Ban
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
