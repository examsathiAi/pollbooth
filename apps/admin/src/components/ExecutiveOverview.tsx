"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, ShieldAlert, TrendingUp, Users, Loader2, RefreshCcw, Vote } from "lucide-react";
import { api } from "@/lib/api";

export function ExecutiveOverview() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchLiveStats = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsSyncing(true);
    
    try {
      const res = await api.get("/api/v1/admin/dashboard");
      setStats(res.data);
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Real Users Mapping */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Total Users</span>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.users?.total ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <TrendingUp className="mr-1 h-3 w-3" /> {stats?.users?.active_today ?? 0} active today
            </span>
          </div>
        </div>

        {/* Real Engagement Mapping */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Total Engagement</span>
            <Vote className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.engagement?.total_votes ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-slate-500">Votes Cast</span>
          </div>
        </div>

        {/* Real Polls Mapping */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Platform Polls</span>
            <Activity className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.polls?.total ?? 0}</span>
            <span className="flex items-center text-xs font-medium text-cyan-600">
              {stats?.polls?.active ?? 0} Currently Active
            </span>
          </div>
        </div>

        {/* Real Moderation Mapping */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-sm font-medium">Pending Moderation</span>
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{stats?.moderation?.pending_review ?? 0}</span>
            <span className="text-xs font-medium text-slate-500">flagged items</span>
          </div>
        </div>
      </div>
    </div>
  );
}