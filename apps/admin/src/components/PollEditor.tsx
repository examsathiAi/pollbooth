"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { BTN, BTN_PRIMARY, INPUT, Notice, Spinner, errText } from "@/components/ui";

const CATEGORIES = [
  "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS", "LOCAL",
  "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH", "FOOD", "TRAVEL",
  "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS", "WORK_CULTURE", "ENVIRONMENT", "OTHER",
];

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

const blankToNull = (v: string) => (v.trim() === "" ? null : v.trim());
const splitList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-[#1f1b18]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#625a50]">{hint}</span> : null}
    </label>
  );
}

export function PollEditor({ id, onClose, onSaved }: { id: string; onClose: () => void; onSaved: (text: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [votes, setVotes] = useState(0);
  const [origCount, setOrigCount] = useState(0);
  const [f, setF] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/v1/admin/polls/${id}`);
        const p = res.data.poll;
        setLocked(!!p.options_locked);
        setVotes(p.votes || 0);
        setOrigCount((p.options || []).length);
        setF({
          question: p.question || "",
          options: p.options || [],
          category: p.category || "OTHER",
          end_date: toLocalInput(p.end_date),
          image_url: p.image_url || "",
          is_commercial: !!p.is_commercial,
          seo_title: p.seo_title || "",
          meta_description: p.meta_description || "",
          og_title: p.og_title || "",
          og_description: p.og_description || "",
          whatsapp_share_text: p.whatsapp_share_text || "",
          x_caption: p.x_caption || "",
          facebook_caption: p.facebook_caption || "",
          instagram_caption: p.instagram_caption || "",
          ai_summary: p.ai_summary || "",
          keywords: (p.keywords || []).join(", "),
          hashtags: (p.hashtags || []).join(", "),
          slug: p.slug || "",
        });
      } catch (err: any) {
        setError(errText(err, "Could not load this poll."));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = (k: string, v: any) => setF((cur: any) => ({ ...cur, [k]: v }));

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/api/v1/polls/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("image_url", res.data.url);
    } catch (err: any) {
      setError(errText(err, "Image upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError(null);
    const options = f.options.map((o: string) => o.trim()).filter(Boolean);
    if (options.length < 2) { setError("A poll needs at least two options."); return; }
    setSaving(true);
    try {
      const payload: any = {
        question: f.question.trim(),
        options,
        category: f.category,
        end_date: f.end_date ? new Date(f.end_date).toISOString() : null,
        image_url: blankToNull(f.image_url),
        is_commercial: f.is_commercial,
        seo_title: blankToNull(f.seo_title),
        meta_description: blankToNull(f.meta_description),
        og_title: blankToNull(f.og_title),
        og_description: blankToNull(f.og_description),
        whatsapp_share_text: blankToNull(f.whatsapp_share_text),
        x_caption: blankToNull(f.x_caption),
        facebook_caption: blankToNull(f.facebook_caption),
        instagram_caption: blankToNull(f.instagram_caption),
        ai_summary: blankToNull(f.ai_summary),
        keywords: splitList(f.keywords),
        hashtags: splitList(f.hashtags),
      };
      const res = await api.patch(`/api/v1/admin/polls/${id}`, payload);
      const n = (res.data.changed || []).length;
      onSaved(n === 0 ? "No changes were needed." : `Saved ${n} change${n === 1 ? "" : "s"}. Live pages refresh within about a minute.`);
    } catch (err: any) {
      setError(errText(err, "Could not save. Nothing was changed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-3 py-6">
      <div className="w-full max-w-3xl rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-5 shadow-xl sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7a1f10]">Edit poll</p>
            <h3 className="mt-1 text-lg font-semibold text-[#1f1b18]">Fix or improve this poll</h3>
          </div>
          <button type="button" onClick={onClose} className={BTN}><X className="h-4 w-4" /> Close</button>
        </div>

        {loading ? <Spinner /> : !f ? (error ? <Notice kind="err" text={error} /> : null) : (
          <div className="space-y-5">
            {error ? <Notice kind="err" text={error} onClose={() => setError(null)} /> : null}

            <Field label="Question">
              <textarea value={f.question} onChange={(e) => set("question", e.target.value)} rows={2} maxLength={1000} className={INPUT} />
            </Field>

            <div>
              <span className="mb-1 block text-sm font-medium text-[#1f1b18]">Options</span>
              {locked ? (
                <p className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {votes} votes are already in, so the existing options are locked to keep results correct. You can still add new options at the end.
                </p>
              ) : null}
              <div className="space-y-2">
                {f.options.map((o: string, i: number) => {
                  const fixed = locked && i < origCount;
                  return (
                    <div key={i} className="flex gap-2">
                      <input value={o} disabled={fixed} maxLength={250} onChange={(e) => set("options", f.options.map((x: string, j: number) => (j === i ? e.target.value : x)))} className={INPUT + (fixed ? " bg-[#f4efe7]" : "")} placeholder={`Option ${i + 1}`} />
                      {!fixed && f.options.length > 2 ? (
                        <button type="button" className={BTN} onClick={() => set("options", f.options.filter((_: string, j: number) => j !== i))}>Remove</button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {f.options.length < 10 ? (
                <button type="button" className={BTN + " mt-2"} onClick={() => set("options", [...f.options, ""])}><Plus className="h-3.5 w-3.5" /> Add option</button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select value={f.category} onChange={(e) => set("category", e.target.value)} className={INPUT}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label="End date and time" hint="Leave empty for no end date.">
                <input type="datetime-local" value={f.end_date} onChange={(e) => set("end_date", e.target.value)} className={INPUT} />
              </Field>
            </div>

            <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
              <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Cover image</span>
              <div className="flex flex-wrap items-center gap-3">
                {f.image_url ? <img src={f.image_url} alt="" className="h-16 w-28 rounded-lg border border-[#d8ceb8] object-cover" /> : <span className="text-xs text-[#625a50]">No image</span>}
                <label className={BTN + " cursor-pointer"}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {f.image_url ? "Change image" : "Upload image"}
                  <input type="file" accept="image/*" className="sr-only" onChange={upload} disabled={uploading} />
                </label>
                {f.image_url ? <button type="button" className={BTN} onClick={() => set("image_url", "")}>Remove image</button> : null}
              </div>
            </div>

            <details className="rounded-2xl border border-[#d8ceb8] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1f1b18]">Search and sharing text (optional)</summary>
              <div className="mt-4 space-y-4">
                <p className="text-xs text-[#625a50]">Page address{f.slug ? ` (locked): ${f.slug}` : " is created automatically and stays fixed once the poll is live"}. Editing these never changes the link.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Search title" hint="Up to 60 characters"><input value={f.seo_title} maxLength={60} onChange={(e) => set("seo_title", e.target.value)} className={INPUT} /></Field>
                  <Field label="Share title" hint="Up to 60 characters"><input value={f.og_title} maxLength={60} onChange={(e) => set("og_title", e.target.value)} className={INPUT} /></Field>
                </div>
                <Field label="Search description" hint="Up to 160 characters"><textarea value={f.meta_description} maxLength={160} rows={2} onChange={(e) => set("meta_description", e.target.value)} className={INPUT} /></Field>
                <Field label="Share description"><textarea value={f.og_description} rows={2} onChange={(e) => set("og_description", e.target.value)} className={INPUT} /></Field>
                <Field label="Summary"><textarea value={f.ai_summary} rows={3} onChange={(e) => set("ai_summary", e.target.value)} className={INPUT} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Keywords" hint="Separate with commas"><textarea value={f.keywords} rows={2} onChange={(e) => set("keywords", e.target.value)} className={INPUT} /></Field>
                  <Field label="Hashtags" hint="Separate with commas"><textarea value={f.hashtags} rows={2} onChange={(e) => set("hashtags", e.target.value)} className={INPUT} /></Field>
                </div>
                <Field label="WhatsApp text"><textarea value={f.whatsapp_share_text} rows={2} onChange={(e) => set("whatsapp_share_text", e.target.value)} className={INPUT} /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="X caption"><textarea value={f.x_caption} rows={2} onChange={(e) => set("x_caption", e.target.value)} className={INPUT} /></Field>
                  <Field label="Facebook caption"><textarea value={f.facebook_caption} rows={2} onChange={(e) => set("facebook_caption", e.target.value)} className={INPUT} /></Field>
                </div>
                <Field label="Instagram caption"><textarea value={f.instagram_caption} rows={2} onChange={(e) => set("instagram_caption", e.target.value)} className={INPUT} /></Field>
              </div>
            </details>

            <label className="flex items-center gap-3 rounded-xl border border-[#d8ceb8] bg-[#f4efe7] px-4 py-3 text-sm text-[#1f1b18]">
              <input type="checkbox" checked={f.is_commercial} onChange={(e) => set("is_commercial", e.target.checked)} className="h-4 w-4 accent-[#7a1f10]" />
              This is a paid / sponsored poll
            </label>

            <div className="flex justify-end gap-2 border-t border-[#d8ceb8] pt-4">
              <button type="button" className={BTN} onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className={BTN_PRIMARY} onClick={save} disabled={saving || !f.question.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
