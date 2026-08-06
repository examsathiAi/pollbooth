"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface CivicIssue {
  id: string;
  title: string;
  description: string;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  status: string;
  created_at: string;
}

interface CivicIssueResponse {
  issues: CivicIssue[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export function CivicIssueReviewPanel() {
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CivicIssueResponse>("/api/v1/civic/issues", { params: { page: 1, limit: 8 } });
      setIssues(res.data.issues);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load civic issues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const convertIssue = async (issue: CivicIssue) => {
    setMessage(null);
    setError(null);
    try {
      await api.post(`/api/v1/civic/issues/${issue.id}/convert`, {
        options: ["Yes", "No"],
      });
      setMessage(`Converted ${issue.title} into a poll.`);
      setIssues((current) => current.filter((item) => item.id !== issue.id));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to convert issue.");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Civic issue review</p>
          <h2 className="text-xl font-semibold text-white">Review community-reported civic issues</h2>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-400" /> Review pipeline</div>
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading civic issues…
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">No civic issues ready for review.</div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <article key={issue.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span>{issue.city || "Unknown city"}, {issue.state || "Unknown state"}</span>
                  </div>
                  <h3 className="mt-2 font-semibold text-white">{issue.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{issue.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-slate-700 px-2.5 py-1">{issue.category || "General"}</span>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1">{issue.status}</span>
                  </div>
                </div>
                <button onClick={() => convertIssue(issue)} className="flex items-center gap-2 rounded-xl bg-cyan-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-500">
                  <CheckCircle2 className="h-4 w-4" /> Convert to poll
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
