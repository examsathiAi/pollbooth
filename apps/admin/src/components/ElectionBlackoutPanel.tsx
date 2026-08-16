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
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-maroon">Election blackout</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">Control political poll blackout windows</h2>
          <p className="mt-2 text-sm text-[#625a50]">This creates the real blackout record used by the backend to block political polls during sensitive periods.</p>
        </div>
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#625a50]">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-maroon" /> Admin control</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Region</span>
          <input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-maroon focus:ring-1 focus:ring-maroon" placeholder="ALL" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Polling date</span>
          <input type="date" value={pollingDate} onChange={(e) => setPollingDate(e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-maroon focus:ring-1 focus:ring-maroon" />
        </label>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> The backend records blackout start time automatically 48 hours before the selected polling date.</div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-maroon px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-maroon-dark disabled:opacity-60">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Save blackout
          </button>
          {message ? <span className="text-sm text-emerald-600">Success: {message}</span> : null}
          {error ? <span className="text-sm text-rose-600">Error: {error}</span> : null}
        </div>
      </form>
    </section>
  );
}
