"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export function ElectionBlackoutPanel() {
  const [region, setRegion] = useState("ALL");
  const [pollingDate, setPollingDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await api.post("/api/v1/admin/election-blackout", {
        region,
        polling_date: pollingDate,
      });
      setMessage("Election blackout window created.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create blackout window.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Election blackout</p>
          <h2 className="text-xl font-semibold text-white">Control political poll blackout windows</h2>
          <p className="mt-2 text-sm text-slate-400">This creates the real blackout record used by the backend to block political polls during sensitive periods.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-400" /> Admin control</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Region</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500" placeholder="ALL" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Polling date</span>
          <input type="date" value={pollingDate} onChange={(e) => setPollingDate(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500" />
        </label>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> The backend records blackout start time automatically 48 hours before the selected polling date.</div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Save blackout
          </button>
          {message ? <span className="text-sm text-emerald-400">{message}</span> : null}
          {error ? <span className="text-sm text-rose-400">{error}</span> : null}
        </div>
      </form>
    </section>
  );
}
