"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BTN, BTN_DANGER, BTN_PRIMARY, CARD, ConfirmDialog, INPUT, Notice, PageHeader, Spinner, errText, fmtDate } from "@/components/ui";

const LABEL: Record<string, { text: string; cls: string }> = {
  ACTIVE: { text: "Active now", cls: "bg-rose-100 text-rose-700" },
  UPCOMING: { text: "Upcoming", cls: "bg-amber-100 text-amber-800" },
  ENDED: { text: "Ended", cls: "bg-slate-200 text-slate-700" },
  OFF: { text: "Switched off", cls: "bg-slate-200 text-slate-700" },
};

export function ElectionBlackoutPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [lastDay, setLastDay] = useState("");
  const [multi, setMulti] = useState(false);
  const [firstDay, setFirstDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [dlg, setDlg] = useState<{ b: any; turnOn: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [formErr, setFormErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/v1/admin/blackouts");
      setRows(res.data.blackouts || []);
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not load blackouts.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastDay) { setNotice({ kind: "err", text: "Please pick the polling day." }); return; }
    setSaving(true);
    try {
      const res = await api.post("/api/v1/admin/blackouts", { polling_date: lastDay, first_polling_date: multi && firstDay ? firstDay : undefined });
      setNotice({ kind: "ok", text: res.data?.message || "Saved." });
      setLastDay(""); setFirstDay(""); setMulti(false);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "Could not save. Nothing was changed.") });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    if (!dlg) return;
    if (reason.trim().length < 3) { setFormErr("Please write a short reason (at least 3 characters)."); return; }
    setSaving(true);
    try {
      const res = await api.patch(`/api/v1/admin/blackouts/${dlg.b.id}`, { active: dlg.turnOn, reason: reason.trim() });
      setNotice({ kind: "ok", text: res.data?.message || "Done." });
      setDlg(null);
      await load();
    } catch (err: any) {
      setNotice({ kind: "err", text: errText(err, "That failed. Nothing was changed.") });
      setDlg(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <PageHeader eyebrow="Compliance" title="Election blackout" hint="Indian law bars opinion polls in the 48 hours before voting closes. While a blackout is on, political polls are hidden from the public feed and cannot be created." />
      {notice ? <Notice kind={notice.kind} text={notice.text} onClose={() => setNotice(null)} /> : null}

      <div className={CARD + " p-5"}>
        <h3 className="mb-1 text-base font-semibold text-[#1f1b18]">Add a blackout</h3>
        <p className="mb-4 text-sm text-[#625a50]">It starts 48 hours before the first polling day begins and stays on until the end of the last polling day (Indian time). It applies to all of India, because the public feed does not yet know a visitor&apos;s state.</p>
        <form onSubmit={create} className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block font-medium">{multi ? "Last polling day" : "Polling day"}</span>
            <input type="date" value={lastDay} onChange={(e) => setLastDay(e.target.value)} className={INPUT} />
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1f1b18]">
            <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} /> Voting happens on several days (phases)
          </label>
          {multi ? (
            <label className="block text-sm"><span className="mb-1 block font-medium">First polling day</span>
              <input type="date" value={firstDay} onChange={(e) => setFirstDay(e.target.value)} className={INPUT} />
            </label>
          ) : null}
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? "Saving..." : "Save blackout"}</button>
        </form>
      </div>

      <div className={CARD + " space-y-3 p-5"}>
        <h3 className="text-base font-semibold text-[#1f1b18]">All blackouts</h3>
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8ceb8] p-8 text-center text-sm text-[#625a50]">No blackouts yet. Political polls are open.</div>
        ) : rows.map((b) => (
          <article key={b.id} className="flex flex-col gap-3 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-[#1f1b18]">
                All India
                <span className={"ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold " + (LABEL[b.status]?.cls || "")}>{LABEL[b.status]?.text || b.status}</span>
              </p>
              <p className="text-xs text-[#625a50]">From {fmtDate(b.blackout_starts)} until {fmtDate(b.blackout_ends)}</p>
            </div>
            {b.status !== "ENDED" ? (
              b.active
                ? <button type="button" className={BTN_DANGER} onClick={() => { setDlg({ b, turnOn: false }); setReason(""); setFormErr(""); }}>Switch off</button>
                : <button type="button" className={BTN} onClick={() => { setDlg({ b, turnOn: true }); setReason(""); setFormErr(""); }}>Switch on</button>
            ) : null}
          </article>
        ))}
      </div>

      {dlg ? (
        <ConfirmDialog
          title={dlg.turnOn ? "Switch this blackout back on?" : "Switch this blackout off?"}
          body={dlg.turnOn ? "Political polls will be hidden again." : "Political polls will become visible again right away. Do this only if the dates were entered wrongly."}
          confirmLabel={dlg.turnOn ? "Switch on" : "Switch off"}
          danger={!dlg.turnOn}
          busy={saving}
          onCancel={() => setDlg(null)}
          onConfirm={toggle}
        >
          <label className="mt-3 block text-sm"><span className="mb-1 block font-medium">Reason (required)</span>
            <input value={reason} onChange={(e) => { setReason(e.target.value); setFormErr(""); }} maxLength={300} className={INPUT} />
          </label>
          {formErr ? <p className="mt-2 text-sm text-rose-600">{formErr}</p> : null}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
