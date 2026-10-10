"use client";

import { ReactNode, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

export const CARD = "rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] shadow-sm";
export const INPUT =
  "w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a1f10] focus:ring-1 focus:ring-[#7a1f10]";
export const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#d8ceb8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f1b18] transition hover:bg-[#f4efe7] disabled:opacity-50";
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#7a1f10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5c1709] disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50";

export function errText(err: any, fallback: string): string {
  const d = err?.response?.data;
  if (typeof d?.message === "string" && d.message) return d.message;
  if (typeof d?.error === "string" && d.error) return d.error;
  return fallback;
}

export function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function fmtDate(v?: string | null): string {
  if (!v) return "\u2014";
  try {
    return new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "\u2014";
  }
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#625a50]" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT + " pl-9"} />
    </div>
  );
}

export function Tabs({ items, active, onChange }: { items: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-[#7a1f10] bg-[#7a1f10] text-white" : "border-[#d8ceb8] bg-white text-[#625a50] hover:bg-[#f4efe7]"}`}
          >
            {t.label}
            {typeof t.count === "number" ? <span className={`ml-1.5 ${on ? "text-white/80" : "text-[#7a1f10]"}`}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 text-xs text-[#625a50]">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button type="button" className={BTN} disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /> Prev</button>
        <button type="button" className={BTN} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function Notice({ kind, text, onClose }: { kind: "ok" | "err"; text: string; onClose?: () => void }) {
  const cls = kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border p-3 text-sm ${cls}`}>
      <span>{text}</span>
      {onClose ? <button type="button" onClick={onClose} className="text-xs font-semibold underline">Dismiss</button> : null}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-10 text-[#7a1f10]">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

export function PageHeader({ eyebrow, title, hint, right }: { eyebrow: string; title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7a1f10]">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-[#1f1b18]">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-[#625a50]">{hint}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function ConfirmDialog({
  title, body, confirmLabel, danger, askReason, children, busy, onConfirm, onCancel,
}: {
  title: string; body?: string; confirmLabel: string; danger?: boolean; askReason?: boolean;
  children?: ReactNode; busy?: boolean; onConfirm: (reason: string) => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#1f1b18]">{title}</h3>
        {body ? <p className="mt-2 text-sm text-[#625a50]">{body}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {askReason ? (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-medium text-[#1f1b18]">Reason (optional, saved in the activity log)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className={INPUT} />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={BTN} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => onConfirm(reason.trim())}
            className={danger ? "inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50" : BTN_PRIMARY}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
