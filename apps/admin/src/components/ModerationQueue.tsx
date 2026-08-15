"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, MapPin, Loader2, Flag } from "lucide-react";
import { api } from "@/lib/api";

interface FlaggedItem {
  id: string;
  type: "OPINION" | "POLL" | "COMMENT";
  content: string;
  flagged_reason: string;
  reported_by_count: number;
  status: string;
  created_at: string;
}

interface CivicIssue {
  id: string;
  title: string;
  description: string;
  location?: string;
  status: string;
  upvotes: number;
}

export function ModerationQueue() {
  const [flags, setFlags] = useState<FlaggedItem[]>([]);
  const [civicIssues, setCivicIssues] = useState<CivicIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchModerationData = async () => {
      try {
        // Fetch flagged content and civic issues simultaneously
        const [modRes, civicRes] = await Promise.allSettled([
          api.get("/api/v1/moderation/queue"),
          api.get("/api/v1/civic/issues")
        ]);

        if (modRes.status === "fulfilled") {
          setFlags(modRes.value.data.queue || modRes.value.data || []);
        }
        if (civicRes.status === "fulfilled") {
          setCivicIssues(civicRes.value.data.issues || civicRes.value.data || []);
        }
      } catch (err: any) {
        setError("Failed to synchronize with moderation endpoints.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchModerationData();
  }, []);

  const handleResolveFlag = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      setIsProcessing(id);
      // Enterprise standard: PUT request to update status
      await api.put(`/api/v1/moderation/${id}/status`, { status: action });
      
      // Optimistically remove from queue
      setFlags(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert("Failed to process moderation action. Ensure the status endpoint is active.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCivicAction = async (id: string, action: "VERIFY" | "DISMISS") => {
    try {
      setIsProcessing(id);
      await api.put(`/api/v1/civic/issues/${id}/status`, { status: action });
      setCivicIssues(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert("Failed to process civic issue.");
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Moderation & Civic Hub</h2>
          <p className="mt-1 text-sm text-slate-500">Unified pipeline for flagged content resolution and community-reported civic issues.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <ShieldAlert className="h-4 w-4"/> AI Auto-Filter Active
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Flagged Content Queue */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Flag className="h-5 w-5 text-rose-600" /> Flagged Opinions & Comments
          </h3>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-[500px] overflow-y-auto scrollbar-thin">
            {flags.length > 0 ? (
              <div className="space-y-4">
                {flags.map((flag) => (
                  <div key={flag.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-100 px-2 py-1 rounded">
                        {flag.type} • {flag.reported_by_count} Reports
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {flag.created_at ? new Date(flag.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-3">“{flag.content}”</p>
                    <p className="text-xs text-rose-700 mb-4 border-l-2 border-rose-300 pl-2">Reason: {flag.flagged_reason}</p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleResolveFlag(flag.id, "REJECT")}
                        disabled={isProcessing === flag.id}
                        className="flex flex-1 justify-center items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 transition disabled:opacity-50"
                      >
                        {isProcessing === flag.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Remove Content
                      </button>
                      <button 
                        onClick={() => handleResolveFlag(flag.id, "APPROVE")}
                        disabled={isProcessing === flag.id}
                        className="flex flex-1 justify-center items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Ignore Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <CheckCircle className="h-12 w-12 text-emerald-200 mb-3" />
                <p className="text-sm font-medium">Zero flagged items.</p>
                <p className="text-xs mt-1">The community is operating smoothly.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Civic Issues Pipeline */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" /> Civic Issue Verification
          </h3>
          
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-[500px] overflow-y-auto scrollbar-thin">
            {civicIssues.length > 0 ? (
              <div className="space-y-4">
                {civicIssues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-slate-900">{issue.title}</h4>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                        {issue.upvotes} Upvotes
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2">{issue.description}</p>
                    {issue.location && (
                      <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {issue.location}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCivicAction(issue.id, "VERIFY")}
                        disabled={isProcessing === issue.id}
                        className="flex flex-1 justify-center items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {isProcessing === issue.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Verify & Publish
                      </button>
                      <button 
                        onClick={() => handleCivicAction(issue.id, "DISMISS")}
                        disabled={isProcessing === issue.id}
                        className="flex flex-1 justify-center items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                         Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <CheckCircle className="h-12 w-12 text-emerald-200 mb-3" />
                <p className="text-sm font-medium">No pending civic issues.</p>
                <p className="text-xs mt-1">Local reporting queues are clear.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}