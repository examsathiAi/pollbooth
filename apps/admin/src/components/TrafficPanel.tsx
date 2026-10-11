"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CARD, INPUT, Notice, PageHeader, Spinner, errText } from "@/components/ui";

const SRC: Record<string, string> = {
  whatsapp: "WhatsApp", facebook: "Facebook", x: "X (Twitter)", native: "Phone share menu",
  share: "Other share (copy link, Instagram)", referral: "Rewards referral link", direct: "Direct or on-site",
};

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#625a50]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1f1b18]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#625a50]">{hint}</p> : null}
    </div>
  );
}

export function TrafficPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/v1/admin/traffic/shares", { params: { days } });
      setData(res.data);
    } catch (e: any) {
      setErr(errText(e, "Could not load traffic."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const rows: any[] = data?.rows || [];
  const shared = rows.filter((r) => r.src !== "direct");
  const sum = (k: string) => shared.reduce((s, r) => s + (r[k] || 0), 0);
  const maxDaily = Math.max(1, ...(data?.daily || []).map((d: any) => d.visits));

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Growth" title="Shares and traffic" hint="Which share channel and which card design bring people to PollBooth. Counts are anonymous totals; no person is tracked." />
      {err ? <Notice kind="err" text={err} onClose={() => setErr("")} /> : null}
      <div className={CARD + " space-y-5 p-5"}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Period</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={INPUT + " max-w-[180px]"}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? <Spinner /> : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile label="Visits from shares" value={sum("visits")} hint="People who opened a shared link" />
              <Tile label="Votes after a share" value={sum("votes")} hint="Voted in the same visit" />
              <Tile label="Sign-ins after a share" value={sum("signins")} hint="New and returning members" />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#1f1b18]">By channel and card</h3>
              {rows.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#d8ceb8] p-6 text-center text-sm text-[#625a50]">No data yet. Numbers appear as shared links get opened.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-[#625a50]">
                      <tr><th className="py-2 pr-3">Channel</th><th className="pr-3">Card</th><th className="pr-3">Visits</th><th className="pr-3">Votes</th><th className="pr-3">Sign-ins</th><th>Vote rate</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.src + r.card} className="border-t border-[#d8ceb8]">
                          <td className="py-2 pr-3 font-medium">{SRC[r.src] || r.src}</td>
                          <td className="pr-3">{r.card || "-"}</td>
                          <td className="pr-3">{r.visits}</td>
                          <td className="pr-3">{r.votes}</td>
                          <td className="pr-3">{r.signins}</td>
                          <td>{r.visits > 0 && r.src !== "direct" ? Math.round((r.votes / r.visits) * 100) + "%" : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#1f1b18]">Polls that bring the most share traffic</h3>
              {(data?.top_polls || []).length === 0 ? <p className="text-sm text-[#625a50]">Nothing yet.</p> : (
                <ol className="space-y-1 text-sm">
                  {data.top_polls.map((p: any) => <li key={p.poll_id} className="flex justify-between gap-3 border-b border-[#d8ceb8] py-1.5"><span className="line-clamp-1">{p.question}</span><span className="font-semibold">{p.visits}</span></li>)}
                </ol>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[#1f1b18]">Visits from shares, day by day</h3>
              {(data?.daily || []).length === 0 ? <p className="text-sm text-[#625a50]">Nothing yet.</p> : (
                <div className="flex h-28 items-end gap-1">
                  {data.daily.map((d: any) => (
                    <div key={d.day} title={d.day + ": " + d.visits} className="flex-1 rounded-t bg-[#7a1f10]" style={{ height: Math.max(4, Math.round((d.visits / maxDaily) * 100)) + "%" }} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
