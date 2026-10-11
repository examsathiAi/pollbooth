"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const KINDS = [
  { id: "COMPLAINT", label: "A complaint or concern" },
  { id: "CONTENT_REPORT", label: "Report content (poll or comment)" },
  { id: "ACCESS", label: "See the data you hold about me" },
  { id: "CORRECTION", label: "Correct my data" },
  { id: "CONSENT_WITHDRAWAL", label: "Withdraw my consent" },
  { id: "ERASURE", label: "Delete my account and data" },
];

const FIELD = "w-full rounded-xl border border-[#d8ceb8] bg-white px-3 py-2.5 text-sm text-[#1f1b18] outline-none focus:border-[#7a1f10] focus:ring-1 focus:ring-[#7a1f10]";

export function GrievanceForm() {
  const [kind, setKind] = useState("COMPLAINT");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ reference: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) { setError("Please enter your name."); return; }
    if (contact.trim().length < 5) { setError("Please enter your email or phone number so we can reply."); return; }
    if (message.trim().length < 10) { setError("Please describe your request in a few words (at least 10 characters)."); return; }
    setBusy(true);
    try {
      const res = await api.post("/api/v1/grievances", { kind, name: name.trim(), contact: contact.trim(), message: message.trim() });
      setDone({ reference: res.data.reference });
    } catch (err: any) {
      setError(err?.response?.data?.message || "We could not send this. Please try again, or email support@pollbooth.in.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
        <p className="text-base font-semibold">Request received</p>
        <p className="mt-2">Your reference number is <span className="font-bold">{done.reference}</span>. Please keep it. We will reply on the email or phone you gave.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm"><span className="mb-1 block font-medium text-[#1f1b18]">What is this about?</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={FIELD}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
      </label>
      <label className="block text-sm"><span className="mb-1 block font-medium text-[#1f1b18]">Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={FIELD} />
      </label>
      <label className="block text-sm"><span className="mb-1 block font-medium text-[#1f1b18]">Your email or phone number</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={255} className={FIELD} placeholder="The one linked to your PollBooth account" />
      </label>
      <label className="block text-sm"><span className="mb-1 block font-medium text-[#1f1b18]">Details</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} rows={5} className={FIELD} placeholder="Tell us what happened or what you need. For content reports, include the poll link." />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="rounded-xl bg-[#7a1f10] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5c1709] disabled:opacity-60">
        {busy ? "Sending..." : "Submit request"}
      </button>
    </form>
  );
}
