"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

interface PendingPoll {
  id: string;
  question: string;
  category: string;
  status: string;
  created_at: string;
}

interface PendingPollResponse {
  polls: PendingPoll[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export function PollReviewQueue() {
  const [polls, setPolls] = useState<PendingPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PendingPollResponse>("/api/v1/polls/review", { params: { page: 1, limit: 10 } });
      setPolls(res.data.polls || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load pending polls.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleAction = async (pollId: string, action: "approve" | "reject") => {
    setMessage(null);
    setError(null);
    try {
      if (action === "approve") {
        await api.post(`/api/v1/polls/${pollId}/approve`);
        setMessage("Poll approved and is now live.");
      } else {
        await api.post(`/api/v1/polls/${pollId}/reject`);
        setMessage("Poll rejected and removed from review.");
      }
      await loadPending();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} poll.`);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-maroon">Pending review</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">Draft polls awaiting approval</h2>
        </div>
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#625a50]">
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-maroon" /> Needs review</div>
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">Success: {message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">Error: {error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-8 text-center text-sm text-[#625a50]">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading pending polls…
        </div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No polls currently awaiting review.</div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <article key={poll.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#625a50]">{poll.category}</p>
                  <h3 className="mt-1 font-semibold text-[#1f1b18]">{poll.question}</h3>
                  <p className="mt-2 text-sm text-[#625a50]">Created {new Date(poll.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(poll.id, "approve")} className="flex items-center gap-2 rounded-xl bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => handleAction(poll.id, "reject")} className="flex items-center gap-2 rounded-xl bg-rose-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-500">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
