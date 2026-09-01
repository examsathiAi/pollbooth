"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, ShieldAlert, TrendingUp, Users, Loader2, RefreshCcw, Vote, BarChart3, Target } from "lucide-react";
import { api } from "@/lib/api";

export function ExecutiveOverview() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLiveStats = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsSyncing(true);

    try {
      const [adminRes, analyticsRes] = await Promise.all([
        api.get("/api/v1/admin/dashboard"),
        api.get("/api/v1/analytics/platform/stats").catch(() => ({ data: null }))
      ]);
      setStats(adminRes.data);
      setAnalytics(analyticsRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn("Telemetry sync failed", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(() => fetchLiveStats(true), 15000);
    return () => clearInterval(interval);
  }, [fetchLiveStats]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Executive Telemetry</h2>
          <p className="mt-1 text-sm text-slate-500">Live platform operations wired directly to database diagnostics.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <RefreshCcw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
          Last synced: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* OPERATIONAL TELEMETRY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Total Users</span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.users?.total?.toLocaleString() ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <TrendingUp className="mr-1 h-3 w-3" /> {stats?.users?.active_today?.toLocaleString() ?? 0} active today
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Total Engagement</span>
            <Vote className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.engagement?.total_votes?.toLocaleString() ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-slate-500">Votes Cast</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Platform Polls</span>
            <Activity className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.polls?.total?.toLocaleString() ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-cyan-600">
              {stats?.polls?.active?.toLocaleString() ?? 0} Currently Active
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Pending Moderation</span>
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.moderation?.pending_review?.toLocaleString() ?? 0}</span>
            <span className="text-xs font-medium text-slate-500">flagged items</span>
          </div>
        </div>
      </div>

      {/* B2B SPONSORSHIP METRICS */}
      {analytics && (
        <div className="pt-4">
          <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-900">B2B Sponsorship & Reach Metrics</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm font-medium">7-Day Vote Volume</span>
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="mt-4 flex flex-col">
                <span className="text-3xl font-bold text-slate-900">{analytics.weekly_activity?.votes_last_week?.toLocaleString() ?? 0}</span>
                <span className="mt-1 text-xs font-medium text-emerald-600">High-intent pitch metric</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm font-medium">Opinions Per Poll</span>
                <Target className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="mt-4 flex flex-col">
                <span className="text-3xl font-bold text-slate-900">{analytics.average_engagement?.opinions_per_poll?.toLocaleString() ?? 0}</span>
                <span className="mt-1 text-xs font-medium text-slate-500">Average qualitative engagement</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm font-medium">7-Day Qualitative Data</span>
                <Vote className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="mt-4 flex flex-col">
                <span className="text-3xl font-bold text-slate-900">{analytics.weekly_activity?.opinions_last_week?.toLocaleString() ?? 0}</span>
                <span className="mt-1 text-xs font-medium text-slate-500">Recent opinions published</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
