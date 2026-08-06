"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const categories = ["POLITICS", "BOLLYWOOD", "SPORTS", "SOCIAL", "LOCAL", "OTHER"] as const;

export default function SuggestPage() {
  const { user, isLoading } = useAuth();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("SOCIAL");
  const [context, setContext] = useState("");
  const [region, setRegion] = useState("ALL_INDIA");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!context.trim()) {
        setError("A short reason is required so we can review your poll idea.");
        setSubmitting(false);
        return;
      }

      await api.post("/api/v1/surveys/suggestions", {
        question_text: question.trim(),
        category,
        context: context.trim(),
        target_region: region as "MY_CITY" | "MY_STATE" | "ALL_INDIA",
      });
      setSubmitted(true);
      setQuestion("");
      setContext("");
      setRegion("ALL_INDIA");
      setCategory("SOCIAL");
    } catch (err: any) {
      setError(err.response?.data?.message || "We could not submit your suggestion right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-slate-600">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Suggest a Poll</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">Please sign in to submit a poll suggestion for the Pulse community.</p>
          <Link href="/auth/login?redirect=/suggest" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">Community input</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Suggest a Poll</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Share a topic that would matter to your community. Our team reviews each suggestion before it becomes a live poll.</p>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Thanks! Our team will review your suggestion.
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="question">Poll question</label>
            <textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} required minLength={10} maxLength={200} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="What should Pulse ask the community next?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value as (typeof categories)[number])} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="region">Target region</label>
              <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="ALL_INDIA">All India</option>
                <option value="MY_STATE">My state</option>
                <option value="MY_CITY">My city</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="context">Why this poll matters</label>
            <textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} rows={4} minLength={20} maxLength={500} required className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Explain why this poll should run for your community." />
            <p className="mt-2 text-xs text-slate-500">Tell us why this topic is important. Minimum 20 characters.</p>
          </div>
          <button type="submit" disabled={submitting} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit suggestion"}
          </button>
        </form>
      </div>
    </div>
  );
}
