"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, X } from "lucide-react";

interface ProgressiveGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}

const OPTIONS = ["Gen Z", "Millennials", "Gen X", "Boomers", "Prefer not to say"];

export function ProgressiveGateModal({ isOpen, onClose, onSelect }: ProgressiveGateModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setMessage("");
    }
  }, [isOpen]);

  const statusLabel = useMemo(() => (selected ? `Saved for ${selected}` : "Single-question prompt"), [selected]);

  const handleSelect = async (value: string) => {
    setIsSaving(true);
    setMessage("");
    try {
      const mappedValue = value === "Prefer not to say" ? "PREFER_NOT_TO_SAY" : value === "Gen Z" ? "GEN_Z" : value === "Millennials" ? "MILLENNIAL" : value === "Gen X" ? "GEN_X" : value === "Boomers" ? "BOOMER" : "PREFER_NOT_TO_SAY";
      await api.patch("/api/v1/users/profile", { age_bracket: mappedValue });
      setSelected(value);
      onSelect(value);
      setMessage("Saved. Your profile is now more complete.");
      setTimeout(() => onClose(), 700);
    } catch {
      setMessage("We could not save this answer yet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-3 py-4 md:items-center">
      <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
              <Sparkles className="h-4 w-4" />
              {statusLabel}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-white">Which generation speaks for you?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">This helps PollBooth surface more relevant local voices without blocking your vote.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={isSaving}
              className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:bg-cyan-500/10 disabled:opacity-60"
            >
              {option}
            </button>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm text-cyan-300">{message}</p> : null}
      </div>
    </div>
  );
}
