"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Sparkles, X, Link as LinkIcon, Users, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

const CATEGORY_OPTIONS = [
  "POLITICS", "CIVIC", "BOLLYWOOD", "SPORTS", "CURRENT_EVENTS", "LOCAL",
  "SOCIAL", "ECONOMY", "EDUCATION", "HEALTH", "TECH", "FOOD", "TRAVEL",
  "FASHION", "AUTO", "REAL_ESTATE", "STARTUPS", "WORK_CULTURE", "ENVIRONMENT", "OTHER",
];

const TARGETING_OPTIONS = {
  genders: ["MALE", "FEMALE", "OTHER"],
  age_brackets: ["18-24", "25-34", "35-44", "45-54", "55+"],
  city_tiers: ["TIER_1", "TIER_2", "TIER_3"],
  income_brackets: ["LOWER", "MIDDLE", "UPPER"],
  states: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry"
  ],
};

interface AiContent {
  improved_question: string;
  seo_title: string;
  meta_description: string;
  slug: string;
  keywords: string[];
  hashtags: string[];
  facebook_caption: string;
  instagram_caption: string;
  x_caption: string;
  whatsapp_share_text: string;
  ai_summary: string;
  faq: Array<{ question: string; answer: string }>;
  og_title: string;
  og_description: string;
  suggested_topics: string[];
  suggested_options?: string[];
  sources?: Array<{ url: string; title: string; publisher?: string; published_at?: string }>;
}

export function PollCreationPanel() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Yes", "No"]);
  const [category, setCategory] = useState("CIVIC");
  const [duration, setDuration] = useState(3);
  const [isCommercial, setIsCommercial] = useState(false);
  
  // Targeting State
  const [showTargeting, setShowTargeting] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiContent, setAiContent] = useState<AiContent | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicTags, setTopicTags] = useState<string[]>([]);

  const optionSummary = useMemo(() => options.filter(Boolean).join(" • "), [options]);
  const canGenerate = Boolean(question.trim()) && Boolean(category.trim());

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 5) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== index));
  };

  const toggleFilter = (categoryKey: string, value: string) => {
    setFilters(prev => {
      const current = prev[categoryKey] || [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [categoryKey]: next };
    });
  };

  const handleGenerate = async () => {
    setError(null);
    setMessage(null);
    setIsGenerating(true);
    try {
      const response = await api.post<AiContent>("/api/v1/ai/improve-question", { question, category });
      const content = response.data;
      setAiContent(content);
      setQuestion(content.improved_question);
      setTopicTags(content.suggested_topics.slice(0, 4));
      if (content.suggested_options && content.suggested_options.length >= 2) {
        setOptions(content.suggested_options.slice(0, 5));
      }
      setMessage("AI content generated. Review and edit before posting.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to generate AI content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addTopicTag = () => {
    const trimmed = topicDraft.trim();
    if (!trimmed) return;
    setTopicTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setTopicDraft("");
  };

  const removeTopicTag = (topic: string) => {
    setTopicTags((prev) => prev.filter((item) => item !== topic));
  };

  const updateAiField = <K extends keyof AiContent>(field: K, value: AiContent[K]) => {
    setAiContent((current) => (current ? { ...current, [field]: value } : current));
    if (field === "improved_question") setQuestion(String(value));
  };

  const updateFaqItem = (index: number, field: "question" | "answer", value: string) => {
    if (!aiContent) return;
    const nextFaq = [...aiContent.faq];
    nextFaq[index] = { ...nextFaq[index], [field]: value };
    updateAiField("faq", nextFaq);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      // Clean empty filters before sending to backend
      const target_filters = Object.fromEntries(
        Object.entries(filters).filter(([_, values]) => values.length > 0)
      );

      const payload = {
        question: question.trim(),
        options: options.filter(Boolean),
        category,
        target_filters,
        status: "PENDING_REVIEW",
        is_active: false,
        is_commercial: isCommercial,
        end_date: endDate.toISOString(),
        seo_title: aiContent?.seo_title?.trim() || undefined,
        meta_description: aiContent?.meta_description?.trim() || undefined,
        slug: aiContent?.slug?.trim() || undefined,
        keywords: aiContent?.keywords || [],
        hashtags: aiContent?.hashtags || [],
        facebook_caption: aiContent?.facebook_caption?.trim() || undefined,
        instagram_caption: aiContent?.instagram_caption?.trim() || undefined,
        x_caption: aiContent?.x_caption?.trim() || undefined,
        whatsapp_share_text: aiContent?.whatsapp_share_text?.trim() || undefined,
        ai_summary: aiContent?.ai_summary?.trim() || undefined,
        faq: aiContent?.faq || [],
        og_title: aiContent?.og_title?.trim() || undefined,
        og_description: aiContent?.og_description?.trim() || undefined,
        topic_names: topicTags,
      };

      await api.post("/api/v1/polls", payload);
      setMessage("Poll created successfully with state and demographic targeting applied.");
      setQuestion("");
      setOptions(["Yes", "No"]);
      setCategory("CIVIC");
      setDuration(3);
      setFilters({});
      setIsCommercial(false);
      setAiContent(null);
      setTopicTags([]);
      setTopicDraft("");
      setShowTargeting(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create poll.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">Poll creation</p>
          <h2 className="text-xl font-semibold text-white">Create a new admin-authored poll</h2>
          <p className="mt-2 text-sm text-slate-400">Build organic polls or highly targeted commercial surveys by state & demographics.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <label className="block flex-1">
            <span className="mb-2 block text-sm font-medium text-slate-300">Question</span>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500" placeholder="What should the community weigh in on?" required />
          </label>
          <button type="button" onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate AI Content
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Poll Duration</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500">
              <option value={1}>24 Hours</option>
              <option value={3}>3 Days</option>
              <option value={7}>1 Week</option>
              <option value={14}>2 Weeks</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500">
              {CATEGORY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {/* Commercial Audience Targeting Suite */}
        <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
          <button type="button" onClick={() => setShowTargeting(!showTargeting)} className="flex w-full items-center justify-between text-sm font-medium text-slate-200">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-400" /> Advanced Audience Targeting (States & Demographics)</span>
            {showTargeting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showTargeting && (
            <div className="mt-4 space-y-5 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-400 mb-2">Unselected categories target all users. Click items to restrict participation to specific segments.</p>
              
              {Object.entries(TARGETING_OPTIONS).map(([filterKey, optionsList]) => (
                <div key={filterKey}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{filterKey.replace('_', ' ')}</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    {optionsList.map((opt) => {
                      const isSelected = filters[filterKey]?.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleFilter(filterKey, opt)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            isSelected 
                              ? "bg-violet-600 text-white border-transparent shadow-sm" 
                              : "bg-slate-900 border border-slate-700 text-slate-400 hover:border-violet-500/50 hover:text-slate-200"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <label className="flex items-center gap-3 mt-4 rounded-xl border border-violet-900/50 bg-violet-900/10 px-4 py-3 text-sm text-violet-200">
                <input type="checkbox" checked={isCommercial} onChange={(e) => setIsCommercial(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-violet-600" />
                Mark this poll as a paid commercial survey
              </label>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Options</span>
            <button type="button" onClick={addOption} className="flex items-center gap-2 text-sm text-cyan-300">
              <Plus className="h-4 w-4" /> Add option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input value={option} onChange={(e) => updateOption(index, e.target.value)} className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none focus:border-violet-500" placeholder={`Option ${index + 1}`} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(index)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {aiContent ? (
          <div className="space-y-4 rounded-2xl border border-cyan-800/60 bg-cyan-950/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-cyan-300">AI content preview</p>
                <p className="text-sm text-slate-400">Edit any generated field before you create the poll.</p>
              </div>
              <button type="button" onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-900/40 disabled:opacity-60">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Regenerate
              </button>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">Improved question</span>
                <textarea value={aiContent.improved_question} onChange={(e) => updateAiField("improved_question", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">SEO title</span>
                  <input value={aiContent.seo_title} onChange={(e) => updateAiField("seo_title", e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Meta description</span>
                  <textarea value={aiContent.meta_description} onChange={(e) => updateAiField("meta_description", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Slug</span>
                  <input value={aiContent.slug} onChange={(e) => updateAiField("slug", e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Keywords</span>
                  <textarea value={aiContent.keywords.join(", ")} onChange={(e) => updateAiField("keywords", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Hashtags</span>
                  <textarea value={aiContent.hashtags.join(", ")} onChange={(e) => updateAiField("hashtags", e.target.value.split(",").map((item) => item.trim().replace(/^#+/, "")).filter(Boolean))} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">AI summary</span>
                  <textarea value={aiContent.ai_summary} onChange={(e) => updateAiField("ai_summary", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Facebook caption</span>
                  <textarea value={aiContent.facebook_caption} onChange={(e) => updateAiField("facebook_caption", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Instagram caption</span>
                  <textarea value={aiContent.instagram_caption} onChange={(e) => updateAiField("instagram_caption", e.target.value)} rows={3} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">X caption</span>
                  <textarea value={aiContent.x_caption} onChange={(e) => updateAiField("x_caption", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">WhatsApp share text</span>
                  <textarea value={aiContent.whatsapp_share_text} onChange={(e) => updateAiField("whatsapp_share_text", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Open Graph title</span>
                  <input value={aiContent.og_title} onChange={(e) => updateAiField("og_title", e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Open Graph description</span>
                  <textarea value={aiContent.og_description} onChange={(e) => updateAiField("og_description", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" />
                </label>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-300">FAQ</span>
                {aiContent.faq.map((item, index) => (
                  <div key={index} className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                    <input value={item.question} onChange={(e) => updateFaqItem(index, "question", e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" placeholder="Question" />
                    <textarea value={item.answer} onChange={(e) => updateFaqItem(index, "answer", e.target.value)} rows={2} className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" placeholder="Answer" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Suggested topics</span>
                <div className="flex flex-wrap gap-2">
                  {topicTags.map((topic) => (
                    <div key={topic} className="inline-flex items-center gap-2 rounded-full border border-cyan-700 bg-cyan-950/40 px-3 py-1 text-sm text-cyan-200">
                      <input value={topic} onChange={(e) => setTopicTags((prev) => prev.map((item) => (item === topic ? e.target.value : item)))} className="w-24 bg-transparent text-sm text-cyan-100 outline-none" />
                      <button type="button" onClick={() => removeTopicTag(topic)} className="text-cyan-400"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500" placeholder="Add a topic" />
                  <button type="button" onClick={addTopicTag} className="rounded-2xl border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-300">Add</button>
                </div>
              </div>

              {aiContent.sources && aiContent.sources.length > 0 && (
                <div className="mt-4 border-t border-cyan-800/40 pt-4">
                  <span className="mb-2 block text-sm font-medium text-slate-300">Verified Sources (Click to audit)</span>
                  <div className="grid gap-2">
                    {aiContent.sources.map((source, idx) => (
                      <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate">{source.title} {source.publisher ? `— ${source.publisher}` : ""}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">
          <div className="font-medium text-slate-200">Preview</div>
          <p className="mt-1">{question || "Your poll question will appear here"}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{optionSummary || "Add at least two options"}</p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={isSubmitting || !question.trim() || options.filter(Boolean).length < 2} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Launch Poll
          </button>
          {message ? <span className="text-sm font-medium text-emerald-400">{message}</span> : null}
          {error ? <span className="text-sm font-medium text-rose-400">{error}</span> : null}
        </div>
      </form>
    </section>
  );
}