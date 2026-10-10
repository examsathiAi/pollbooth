"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CARD, Notice, PageHeader, Pager, SearchBox, Spinner, errText, fmtDate, useDebounced } from "@/components/ui";

function pretty(action: string) {
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export function ActivityLog() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/audit", { params: { q: dq, page, limit: 25 } });
      setRows(res.data.logs || []);
      setTotalPages(res.data.pagination?.total_pages || 1);
      setError(null);
    } catch (err: any) {
      setError(errText(err, "Could not load the activity log."));
    } finally {
      setLoading(false);
    }
  }, [dq, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Activity log" title="Who did what, and when" hint="Every poll edit, stop/restart/hide, comment decision and role change by your team is recorded here." />
      {error ? <Notice kind="err" text={error} /> : null}
      <div className={CARD + " space-y-4 p-4"}>
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by action, e.g. poll, comment, role" />
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No activity recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#d8ceb8] text-xs uppercase text-[#625a50]">
                <tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Who</th><th className="py-2 pr-4">What</th><th className="py-2">Details</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e7dfcd]">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap py-2 pr-4 text-xs text-[#625a50]">{fmtDate(r.created_at)}</td>
                    <td className="py-2 pr-4 text-xs">{r.by}</td>
                    <td className="py-2 pr-4 font-medium text-[#1f1b18]">{pretty(r.action)}<div className="text-[10px] font-normal text-[#625a50]">{r.entity_type}</div></td>
                    <td className="max-w-xs py-2 text-xs text-[#625a50]">{r.metadata?.reason ? "Reason: " + r.metadata.reason : r.metadata?.changes ? "Changed: " + Object.keys(r.metadata.changes).join(", ") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </section>
  );
}
