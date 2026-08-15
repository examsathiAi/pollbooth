"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

const categories = ["INFRASTRUCTURE", "SANITATION", "ELECTRICITY", "WATER", "TRAFFIC", "SAFETY", "OTHER"] as const;

export default function CivicReportPage() {
  const { user, isLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("INFRASTRUCTURE");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post("/api/v1/civic/issues", {
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        category,
      });
      setSubmitted(true);
      setTitle("");
      setDescription("");
      setCity("");
      setState("");
      setCategory("INFRASTRUCTURE");
    } catch (err: any) {
      setError(err.response?.data?.message || "We could not submit your report right now.");
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
          <h1 className="text-2xl font-semibold text-slate-900">Report a Civic Issue</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">Please sign in to report a civic issue that needs attention.</p>
          <Link href="/auth/login?redirect=/civic/report" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-600">Community reporting</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Report a Civic Issue</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Let local authorities and the PollBooth community know about issues affecting your city or state.</p>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Thanks! Our team will review your report.
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="title">Issue title</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={10} maxLength={200} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Streetlight outage near the market" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value as (typeof categories)[number])} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="state">State</label>
              <input id="state" value={state} onChange={(e) => setState(e.target.value)} required className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Delhi" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="description">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={1000} className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="Describe the issue in a few sentences." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="city">City</label>
            <input id="city" value={city} onChange={(e) => setCity(e.target.value)} required className="w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="New Delhi" />
          </div>
          <button type="submit" disabled={submitting} className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60">
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}
