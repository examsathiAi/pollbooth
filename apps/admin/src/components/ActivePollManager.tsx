"use client";

import { useEffect, useState } from "react";
import { Activity, Power, EyeOff, Play, Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Poll {
  id: string;
  question: string;
  status: string;
  is_active: boolean;
  end_date: string | null;
}

export function ActivePollManager() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = async () => {
    try {
      const res = await api.get("/api/v1/admin/polls/manage");
      setPolls(res.data.polls || []);
    } catch (err) { } finally { setLoading(false); }
  };

  useEffect(() => { fetchPolls(); }, []);

  const executeAction = async (id: string, action: string) => {
    if (!window.confirm(`Are you sure you want to ${action} this poll?`)) return;
    try {
      const payload: any = { action };
      if (action === "EXTEND") {
        const days = window.prompt("Enter number of days to extend:");
        if (!days || isNaN(Number(days))) return;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + parseInt(days));
        payload.endDate = newDate.toISOString();
      }
      await api.patch(`/api/v1/admin/polls/${id}/lifecycle`, payload);
      await fetchPolls(); // Instantly refresh table
    } catch (err: any) {
      window.alert(err.response?.data?.message || "Action failed.");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#7a2e2e]" /></div>;

  return (
    <div className="rounded-2xl border border-[#d8ceb8] bg-white shadow-sm overflow-hidden">
      <div className="border-b border-[#d8ceb8] bg-[#f4efe7] p-4">
        <h2 className="text-lg font-bold text-[#1f1b18] flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#7a2e2e]" /> Platform Lifecycle Manager
        </h2>
      </div>
      <div className="divide-y divide-[#d8ceb8]">
        {polls.map((poll) => (
          <div key={poll.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50">
            <div>
              <p className="font-semibold text-sm">{poll.question}</p>
              <div className="flex gap-2 mt-2 text-[10px] font-bold">
                <span className={poll.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-600'}>{poll.status}</span>
                <span>•</span>
                <span className={poll.is_active ? 'text-blue-700' : 'text-rose-700'}>{poll.is_active ? 'VISIBLE' : 'HIDDEN'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => executeAction(poll.id, "EXTEND")} className="px-3 py-1.5 border rounded text-xs hover:bg-indigo-50">Extend</button>
              <button onClick={() => executeAction(poll.id, "REOPEN")} className="px-3 py-1.5 border rounded text-xs hover:bg-emerald-50">Reopen</button>
              <button onClick={() => executeAction(poll.id, "CLOSE")} className="px-3 py-1.5 border rounded text-xs hover:bg-orange-50">Close</button>
              {poll.is_active ? (
                <button onClick={() => executeAction(poll.id, "HIDE")} className="px-3 py-1.5 border rounded text-xs hover:bg-rose-50 text-rose-600 border-rose-200">Hide</button>
              ) : (
                <button onClick={() => executeAction(poll.id, "UNHIDE")} className="px-3 py-1.5 border rounded text-xs hover:bg-blue-50 text-blue-600 border-blue-200">Unhide</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
