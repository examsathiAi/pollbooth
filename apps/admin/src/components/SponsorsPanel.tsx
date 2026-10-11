"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BTN, BTN_PRIMARY, CARD, INPUT, Notice, PageHeader, SearchBox, Spinner, Tabs, errText } from "@/components/ui";

function csvCell(v: any): string {
  return '"' + String(v ?? "").replace(/"/g, '""') + '"';
}

function Bars({ title, g }: { title: string; g: any }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-[#1f1b18]">{title}</h4>
      {g.groups.length === 0 ? <p className="text-xs text-[#625a50]">Not enough voters yet to show groups safely.</p> : (
        <div className="space-y-1.5">
          {g.groups.map((x: any) => (
            <div key={x.name} className="text-xs">
              <div className="flex justify-between"><span>{x.name}</span><span>{x.count} ({x.pct}%)</span></div>
              <div className="h-2 rounded bg-[#e8dfcc]"><div className="h-2 rounded bg-[#7a1f10]" style={{ width: Math.min(100, x.pct) + "%" }} /></div>
            </div>
          ))}
        </div>
      )}
      {g.small_groups_hidden > 0 ? <p className="mt-1 text-[11px] text-[#625a50]">{g.small_groups_hidden} voters are in groups too small to show.</p> : null}
    </div>
  );
}

export function SponsorsPanel() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ client_name: "", start_date: "", end_date: "", amount_paid: "" });
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/traffic/sponsors");
      setList(res.data.sponsors || []);
    } catch (e: any) {
      setNotice({ kind: "err", text: errText(e, "Could not load sponsored polls.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReport = async (id: string) => {
    setOpen(id);
    setDetail(null);
    try {
      const res = await api.get(`/api/v1/admin/traffic/sponsors/${id}`);
      setDetail(res.data);
      const c = res.data.campaign;
      setForm({
        client_name: c?.client_name || "",
        start_date: c?.start_date ? String(c.start_date).slice(0, 10) : "",
        end_date: c?.end_date ? String(c.end_date).slice(0, 10) : "",
        amount_paid: c?.amount_paid != null ? String(c.amount_paid) : "",
      });
    } catch (e: any) {
      setNotice({ kind: "err", text: errText(e, "Could not load the report.") });
      setOpen(null);
    }
  };

  const save = async () => {
    if (!open) return;
    if (form.client_name.trim().length < 1) { setNotice({ kind: "err", text: "Please enter the client name." }); return; }
    setBusy(true);
    try {
      await api.put(`/api/v1/admin/traffic/sponsors/${open}/campaign`, {
        client_name: form.client_name.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        amount_paid: form.amount_paid === "" ? null : Math.round(Number(form.amount_paid)),
      });
      setNotice({ kind: "ok", text: "Campaign saved." });
      await load();
    } catch (e: any) {
      setNotice({ kind: "err", text: errText(e, "Could not save. Nothing was changed.") });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!detail) return;
    const t = detail.totals;
    const lines: string[] = [
      ["Poll", detail.poll.question].map(csvCell).join(","),
      ["Client", form.client_name].map(csvCell).join(","),
      ["Campaign start", form.start_date].map(csvCell).join(","),
      ["Campaign end", form.end_date].map(csvCell).join(","),
      ["Views (unique visitor sessions)", t.views].map(csvCell).join(","),
      ["Visits from shared links", t.share_visits].map(csvCell).join(","),
      ["Votes", t.votes].map(csvCell).join(","),
      ["Comments", t.comments].map(csvCell).join(","),
      ["Vote rate %", t.vote_rate ?? ""].map(csvCell).join(","),
      "",
      ["Day", "Views"].map(csvCell).join(","),
      ...detail.daily.map((d: any) => [d.day, d.views].map(csvCell).join(",")),
      "",
      ["City", "Voters", "Share %"].map(csvCell).join(","),
      ...detail.cities.groups.map((x: any) => [x.name, x.count, x.pct].map(csvCell).join(",")),
      "",
      ["Age group", "Voters", "Share %"].map(csvCell).join(","),
      ...detail.ages.groups.map((x: any) => [x.name, x.count, x.pct].map(csvCell).join(",")),
      "",
      ["Groups smaller than " + detail.min_group_size + " voters are not shown."].map(csvCell).join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sponsor-report-" + detail.poll.id.slice(0, 8) + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const shown = list.filter((s) => {
    const live = s.status === "ACTIVE" && s.is_active;
    if (tab === "LIVE" && !live) return false;
    if (tab === "ENDED" && live) return false;
    const needle = q.trim().toLowerCase();
    return !needle || s.question.toLowerCase().includes(needle) || (s.client_name || "").toLowerCase().includes(needle);
  });

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Promotions" title="Sponsored polls and reports" hint="Every sponsored poll with its views, votes and audience. Open a report to record the client and download numbers to send to them. Only totals are shown, never individual voters." />
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}
      <div className={CARD + " space-y-4 p-4"}>
        <Tabs active={tab} onChange={setTab} items={[{ id: "ALL", label: "All" }, { id: "LIVE", label: "Live" }, { id: "ENDED", label: "Ended or hidden" }]} />
        <SearchBox value={q} onChange={setQ} placeholder="Search poll or client" />
        {loading ? <Spinner /> : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No sponsored polls. Mark a poll as commercial when you create it.</div>
        ) : shown.map((s) => (
          <article key={s.id} className="space-y-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[#1f1b18]">{s.question}</p>
                <p className="text-xs text-[#625a50]">{s.client_name ? "Client: " + s.client_name : "No client recorded"} {"•"} {s.status}{s.is_active ? "" : " (hidden)"}</p>
                <p className="mt-1 text-xs text-[#625a50]">{s.views} views {"•"} {s.votes} votes {"•"} {s.comments} comments {"•"} {s.share_visits} share visits {"•"} vote rate {s.vote_rate != null ? s.vote_rate + "%" : "-"}</p>
              </div>
              <button type="button" className={BTN} onClick={() => (open === s.id ? setOpen(null) : openReport(s.id))}>{open === s.id ? "Close report" : "Report"}</button>
            </div>

            {open === s.id ? (
              !detail ? <Spinner /> : (
                <div className="space-y-5 rounded-2xl border border-[#d8ceb8] bg-[#fffdf9] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm"><span className="mb-1 block font-medium">Client name</span><input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} maxLength={100} className={INPUT} /></label>
                    <label className="text-sm"><span className="mb-1 block font-medium">Amount paid (Rs.)</span><input type="number" min={0} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} className={INPUT} /></label>
                    <label className="text-sm"><span className="mb-1 block font-medium">Campaign start</span><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={INPUT} /></label>
                    <label className="text-sm"><span className="mb-1 block font-medium">Campaign end</span><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={INPUT} /></label>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={BTN_PRIMARY} onClick={save} disabled={busy}>{busy ? "Saving..." : "Save campaign"}</button>
                    <button type="button" className={BTN} onClick={download}>Download report (CSV)</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["Views", detail.totals.views], ["Votes", detail.totals.votes], ["Comments", detail.totals.comments], ["Vote rate", detail.totals.vote_rate != null ? detail.totals.vote_rate + "%" : "-"]].map(([l, v]) => (
                      <div key={String(l)} className="rounded-xl border border-[#d8ceb8] bg-[#f4efe7] p-3"><p className="text-[11px] uppercase tracking-wider text-[#625a50]">{l}</p><p className="text-xl font-bold">{v}</p></div>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#625a50]">Views count each visitor once per browser session, when the sponsored poll scrolls into view.</p>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Bars title="Top cities" g={detail.cities} />
                    <Bars title="Age groups" g={detail.ages} />
                  </div>
                </div>
              )
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
