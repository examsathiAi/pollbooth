"use client";

import { useEffect, useState } from "react";
import { PollCreationPanel } from "@/components/PollCreationPanel";
import { PollReviewQueue } from "@/components/PollReviewQueue";
import { api } from "@/lib/api";

interface PollItem {
  id: string;
  question: string;
  category: string;
  status: string;
  total_votes: number;
  created_at: string;
}

export default function PollsPage() {
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ polls: PollItem[] }>('/api/v1/polls?status=ALL&page=1&limit=20');
      setPolls(res.data.polls || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load polls.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPolls(); }, []);

  const updateStatus = async (pollId: string, action: 'publish' | 'archive') => {
    try {
      if (action === 'publish') {
        await api.post(`/api/v1/polls/${pollId}/publish`);
      } else {
        await api.patch(`/api/v1/polls/${pollId}/archive`);
      }
      await loadPolls();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update poll.');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4efe7] p-6 text-[#1f1b18]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-maroon">Admin</p>
            <h1 className="text-3xl font-semibold text-[#1f1b18]">Polls</h1>
          </div>
          <button onClick={() => loadPolls()} className="rounded-2xl border border-[#d8ceb8] px-4 py-2.5 text-sm font-semibold text-[#1f1b18]">Refresh</button>
        </div>

        <PollCreationPanel />
        <PollReviewQueue />

        {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">Error: {error}</div> : null}

        {loading ? (
          <div className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-8 text-center text-sm text-[#625a50]">Loading polls…</div>
        ) : (
          <div className="space-y-3">
            {polls.map((poll) => (
              <article key={poll.id} className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#625a50]">{poll.category}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#1f1b18]">{poll.question}</h2>
                    <p className="mt-2 text-sm text-[#625a50]">Status: {poll.status} • Votes: {poll.total_votes} • Created: {new Date(poll.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(poll.id, 'publish')} className="rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm font-medium text-white">Publish</button>
                    <button onClick={() => updateStatus(poll.id, 'archive')} className="rounded-2xl bg-rose-600/90 px-3 py-2 text-sm font-medium text-white">Archive</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
