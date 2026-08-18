"use client";

import { useEffect, useState } from "react";
import { Activity, Database, ServerCrash, ShieldCheck, Workflow } from "lucide-react";
import { api } from "@/lib/api";

interface HealthResponse {
  timestamp: string;
  services: {
    api: { status: string; latency_ms?: number | null };
    database: { status: string; latency_ms?: number | null };
    workers: { status: string; latency_ms?: number | null };
  };
  counts: {
    users: number;
    polls: number;
    active_polls: number;
    pending_moderation: number;
  };
}

export function PlatformHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<HealthResponse>("/api/v1/admin/health");
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load platform health");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const statCards = data
    ? [
        { label: "Users", value: data.counts.users, icon: ShieldCheck },
        { label: "Polls", value: data.counts.polls, icon: Activity },
        { label: "Active polls", value: data.counts.active_polls, icon: Workflow },
        { label: "Pending moderation", value: data.counts.pending_moderation, icon: ServerCrash },
      ]
    : [];

  return (
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-maroon">Platform health</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">Operational readiness and service status</h2>
        </div>
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] px-3 py-2 text-sm text-[#625a50]">
          <div className="flex items-center gap-2"><Database className="h-4 w-4 text-maroon" /> Live status</div>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-600">Error: {error}</div> : null}

      {loading ? (
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-8 text-center text-sm text-[#625a50]">Loading platform health…</div>
      ) : !data ? null : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                  <div className="flex items-center gap-2 text-sm text-[#625a50]">
                    <Icon className="h-4 w-4 text-maroon" /> {item.label}
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[#1f1b18]">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {Object.entries(data.services).map(([service, detail]) => (
              <div key={service} className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1f1b18]">{service}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${detail.status === "ok" ? "bg-emerald-600/20 text-emerald-700" : "bg-amber-600/20 text-amber-900"}`}>
                    {detail.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#625a50]">Latency: {detail.latency_ms ?? "n/a"} ms</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-4 text-sm text-[#625a50]">
            Last checked {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </section>
  );
}
