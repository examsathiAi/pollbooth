"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PencilLine, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface SurveySuggestion {
  id: string;
  question_text: string;
  category: string;
  context?: string | null;
  target_region?: string | null;
  status: string;
  created_at: string;
  user?: { username?: string | null; city?: string | null };
}

interface SurveyListResponse {
  suggestions: SurveySuggestion[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

export function SurveyApprovals() {
  const [items, setItems] = useState<SurveySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<SurveyListResponse>("/api/v1/surveys/suggestions", { params: { status: "PENDING", page: 1, limit: 8 } });
        setItems(res.data.suggestions);
        setError(null);
      } catch (err: any) {
        setError(err.response?.status === 401 ? "Please log in as an admin" : err.response?.data?.message || "Failed to load survey approvals.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const convertToPoll = async (suggestion: SurveySuggestion) => {
    try {
      setMessage(null);
      await api.post("/api/v1/polls", {
        question: suggestion.question_text,
        options: ["Yes", "No", "Need more context"],
        category: suggestion.category,
        target_filters: { region: suggestion.target_region || "ALL" },
        status: "ACTIVE",
        is_active: true,
      });
      setItems((current) => current.filter((item) => item.id !== suggestion.id));
      setMessage("Suggestion converted into a review-ready poll.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to convert suggestion.");
    }
  };

  return (
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-maroon">Survey approvals</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">Community suggestions into targeted polls</h2>
        </div>
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#625a50]">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-maroon" /> Review pipeline</div>
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">Success: {message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">Error: {error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-8 text-center text-sm text-[#625a50]">Loading suggestions…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No pending survey suggestions.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1f1b18]">{item.question_text}</p>
                  <p className="mt-1 text-sm text-[#625a50]">{item.context || "No extra context provided"}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#625a50]">
                    <span className="rounded-full border border-[#d8ceb8] px-2.5 py-1">{item.category}</span>
                    <span className="rounded-full border border-[#d8ceb8] px-2.5 py-1">Region: {item.target_region || "All"}</span>
                    <span className="rounded-full border border-[#d8ceb8] px-2.5 py-1">Submitted by {item.user?.username || "anonymous"}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 rounded-xl border border-[#d8ceb8] px-3 py-2 text-sm text-[#625a50] hover:border-maroon hover:text-maroon">
                    <PencilLine className="h-4 w-4" /> Edit
                  </button>
                  <button onClick={() => convertToPoll(item)} className="flex items-center gap-2 rounded-xl bg-maroon px-3 py-2 text-sm font-medium text-white transition hover:bg-maroon-dark">
                    <CheckCircle2 className="h-4 w-4" /> Convert
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
