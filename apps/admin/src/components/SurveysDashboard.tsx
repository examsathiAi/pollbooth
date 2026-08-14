"use client";

import { useEffect, useState } from "react";
import { MessageSquare, PlayCircle, ShieldCheck, Loader2, ExternalLink, Download } from "lucide-react";
import { api } from "@/lib/api";

export function SurveysDashboard() {
  const [polls, setPolls] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const pollRes = await api.get("/api/v1/polls", { params: { status: "ACTIVE", limit: 20 } });
        setPolls(pollRes.data.polls || []);
        const sugRes = await api.get("/api/v1/surveys/suggestions").catch(() => ({ data: [] }));
        setSuggestions(Array.isArray(sugRes.data) ? sugRes.data : sugRes.data?.suggestions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLiveData();
  }, []);

  const openLivePoll = (pollId: string) => window.open(`http://localhost:3000/poll/${pollId}`, "_blank");

  const handleExportCSV = async (pollId: string, question: string) => {
    try {
      setIsExporting(pollId);
      const res = await api.get(`/api/v1/analytics/b2b/${pollId}`);
      const rawData = res.data;
      const exportData = Array.isArray(rawData) ? rawData : (rawData?.results || rawData?.data || [rawData]);
      
      if (!exportData || exportData.length === 0) {
        alert("No responses recorded for this survey yet.");
        setIsExporting(null);
        return;
      }

      // Recursive JSON Flattener for nested demographic data
      const flattenObject = (ob: any): any => {
        let toReturn: any = {};
        for (let i in ob) {
          if (!ob.hasOwnProperty(i)) continue;
          if (typeof ob[i] === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
            let flatObject = flattenObject(ob[i]);
            for (let x in flatObject) {
              if (!flatObject.hasOwnProperty(x)) continue;
              toReturn[i + '.' + x] = flatObject[x];
            }
          } else {
            toReturn[i] = Array.isArray(ob[i]) ? ob[i].join(";") : ob[i];
          }
        }
        return toReturn;
      };

      const flattenedData = exportData.map(flattenObject);
      const headers = Array.from(new Set(flattenedData.flatMap(Object.keys))).join(",");
      
      const rows = flattenedData.map((obj: any) => 
        headers.split(",").map(header => {
          const val = obj[header] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      ).join("\n");

      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `B2B_Export_${pollId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      alert("Failed to generate CSV. Ensure the B2B analytics endpoint is returning data.");
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">B2B Campaigns & Survey Operations</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor live commercial surveys, track demographic fulfillment, and export real client data.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4"/> Database Synchronized
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2"><PlayCircle className="h-5 w-5 text-indigo-600" /> Active Client Campaigns</h3>
          {polls.length > 0 ? polls.map((poll) => (
            <div key={poll.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 onClick={() => openLivePoll(poll.id)} className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer">
                    {poll.question} <ExternalLink className="h-4 w-4" />
                  </h4>
                </div>
                <button onClick={() => handleExportCSV(poll.id, poll.question)} disabled={isExporting === poll.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  {isExporting === poll.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export CSV
                </button>
              </div>
            </div>
          )) : <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">No active campaigns running.</div>}
        </div>
      </div>
    </div>
  );
}