"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { CheckCircle2, Loader2, Plus, Sparkles, X, Link as LinkIcon, Users, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";


const AutoResizeTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [props.value]);

  return <AutoResizeTextarea ref={ref} {...props} style={{ minHeight: '44px', overflow: 'hidden', resize: 'none', ...props.style }} />;
};

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

  const optionSummary = useMemo(() => options.filter(Boolean).join(" â€¢ "), [options]);
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
    <section className="rounded-3xl border border-[#d8ceb8] bg-[#fffdf9] p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#7a2e2e]">Poll creation</p>
          <h2 className="text-xl font-semibold text-[#1f1b18]">Create a new admin-authored poll</h2>
          <p className="mt-2 text-sm text-[#625a50]">Build organic polls or highly targeted commercial surveys by state & demographics.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <label className="block flex-1">
            <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Question</span>
            <AutoResizeTextarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" placeholder="What should the community weigh in on?" required />
          </label>
          <button type="button" onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="inline-flex items-center gap-2 rounded-2xl bg-[#7a2e2e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7a2e2e]-dark disabled:opacity-60">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate AI Content
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Poll Duration</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]">
              <option value={1}>24 Hours</option>
              <option value={3}>3 Days</option>
              <option value={7}>1 Week</option>
              <option value={14}>2 Weeks</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]">
              {CATEGORY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {/* Commercial Audience Targeting Suite */}
        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-4">
          <button type="button" onClick={() => setShowTargeting(!showTargeting)} className="flex w-full items-center justify-between text-sm font-medium text-[#1f1b18]">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#7a2e2e]" /> Advanced Audience Targeting (States & Demographics)</span>
            {showTargeting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showTargeting && (
            <div className="mt-4 space-y-5 border-t border-[#d8ceb8] pt-4">
              <p className="text-xs text-[#625a50] mb-2">Unselected categories target all users. Click items to restrict participation to specific segments.</p>
              
              {Object.entries(TARGETING_OPTIONS).map(([filterKey, optionsList]) => (
                <div key={filterKey}>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#625a50] mb-2">{filterKey.replace('_', ' ')}</p>
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
                              ? "bg-[#7a2e2e] text-white border-transparent shadow-sm" 
                              : "bg-white border border-[#d8ceb8] text-[#625a50] hover:border-[#7a2e2e]/50 hover:text-[#1f1b18]"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <label className="flex items-center gap-3 mt-4 rounded-xl border border-[#7a2e2e]/20 bg-[#7a2e2e]/5 px-4 py-3 text-sm text-[#7a2e2e]">
                <input type="checkbox" checked={isCommercial} onChange={(e) => setIsCommercial(e.target.checked)} className="h-4 w-4 rounded border-[#d8ceb8] bg-white accent-maroon" />
                Mark this poll as a paid commercial survey
              </label>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[#1f1b18]">Options</span>
            <button type="button" onClick={addOption} className="flex items-center gap-2 text-sm text-[#7a2e2e]">
              <Plus className="h-4 w-4" /> Add option
            </button>
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input value={option} onChange={(e) => updateOption(index, e.target.value)} className="flex-1 rounded-2xl border border-[#d8ceb8] bg-white px-3 py-3 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" placeholder={`Option ${index + 1}`} />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(index)} className="rounded-xl border border-[#d8ceb8] px-3 py-2 text-sm text-[#625a50] hover:bg-[#f4efe7]">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {aiContent ? (
          <div className="space-y-4 rounded-2xl border border-[#7a2e2e]/20 bg-[#7a2e2e]/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#7a2e2e]">AI content preview</p>
                <p className="text-sm text-[#625a50]">Edit any generated field before you create the poll.</p>
              </div>
              <button type="button" onClick={handleGenerate} disabled={isGenerating || !canGenerate} className="inline-flex items-center gap-2 rounded-2xl border border-[#7a2e2e] px-3 py-2 text-sm font-semibold text-[#7a2e2e] transition hover:bg-[#7a2e2e]/10 disabled:opacity-60">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Regenerate
              </button>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Improved question</span>
                <AutoResizeTextarea value={aiContent.improved_question} onChange={(e) => updateAiField("improved_question", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">SEO title</span>
                  <input value={aiContent.seo_title} onChange={(e) => updateAiField("seo_title", e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Meta description</span>
                  <AutoResizeTextarea value={aiContent.meta_description} onChange={(e) => updateAiField("meta_description", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Slug</span>
                  <input value={aiContent.slug} onChange={(e) => updateAiField("slug", e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Keywords</span>
                  <AutoResizeTextarea value={aiContent.keywords.join(", ")} onChange={(e) => updateAiField("keywords", e.target.value.split(",").map(i => i.trim()))} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Hashtags</span>
                  <AutoResizeTextarea value={aiContent.hashtags.join(", ")} onChange={(e) => updateAiField("hashtags", e.target.value.split(",").map(i => i.trim()))} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">AI summary</span>
                  <AutoResizeTextarea value={aiContent.ai_summary} onChange={(e) => updateAiField("ai_summary", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Facebook caption</span>
                  <AutoResizeTextarea value={aiContent.facebook_caption} onChange={(e) => updateAiField("facebook_caption", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Instagram caption</span>
                  <AutoResizeTextarea value={aiContent.instagram_caption} onChange={(e) => updateAiField("instagram_caption", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">X caption</span>
                  <AutoResizeTextarea value={aiContent.x_caption} onChange={(e) => updateAiField("x_caption", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">WhatsApp share text</span>
                  <AutoResizeTextarea value={aiContent.whatsapp_share_text} onChange={(e) => updateAiField("whatsapp_share_text", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Open Graph title</span>
                  <input value={aiContent.og_title} onChange={(e) => updateAiField("og_title", e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Open Graph description</span>
                  <AutoResizeTextarea value={aiContent.og_description} onChange={(e) => updateAiField("og_description", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" />
                </label>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-[#1f1b18]">FAQ</span>
                {aiContent.faq.map((item, index) => (
                  <div key={index} className="space-y-2 rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-3">
                    <input value={item.question} onChange={(e) => updateFaqItem(index, "question", e.target.value)} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" placeholder="Question" />
                    <AutoResizeTextarea value={item.answer} onChange={(e) => updateFaqItem(index, "answer", e.target.value)} rows={1} className="w-full rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" placeholder="Answer" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-[#1f1b18]">Suggested topics</span>
                <div className="flex flex-wrap gap-2">
                  {topicTags.map((topic) => (
                    <div key={topic} className="inline-flex items-center gap-2 rounded-full border border-[#7a2e2e]/20 bg-[#7a2e2e]/5 px-3 py-1 text-sm text-[#7a2e2e]">
                      <input value={topic} onChange={(e) => setTopicTags((prev) => prev.map((item) => (item === topic ? e.target.value : item)))} className="w-24 bg-transparent text-sm text-[#7a2e2e] outline-none" />
                      <button type="button" onClick={() => removeTopicTag(topic)} className="text-[#7a2e2e]"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={topicDraft} onChange={(e) => setTopicDraft(e.target.value)} className="flex-1 rounded-2xl border border-[#d8ceb8] bg-white px-3 py-2 text-sm text-[#1f1b18] outline-none focus:border-[#7a2e2e] focus:ring-1 focus:ring-[#7a2e2e]" placeholder="Add a topic" />
                  <button type="button" onClick={addTopicTag} className="rounded-2xl border border-[#7a2e2e] px-3 py-2 text-sm font-semibold text-[#7a2e2e]">Add</button>
                </div>
              </div>

              {aiContent.sources && aiContent.sources.length > 0 && (
                <div className="mt-4 border-t border-[#7a2e2e]/20 pt-4">
                  <span className="mb-2 block text-sm font-medium text-[#1f1b18]">Verified Sources (Click to audit)</span>
                  <div className="grid gap-2">
                    {aiContent.sources.map((source, idx) => (
                      <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#7a2e2e] hover:text-[#7a2e2e]-dark hover:underline">
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate">{source.title} {source.publisher ? `â€” ${source.publisher}` : ""}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#d8ceb8] bg-[#f4efe7] p-3 text-sm text-[#625a50]">
          <div className="font-medium text-[#1f1b18]">Preview</div>
          <p className="mt-1">{question || "Your poll question will appear here"}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#625a50]">{optionSummary || "Add at least two options"}</p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button type="submit" disabled={isSubmitting || !question.trim() || options.filter(Boolean).length < 2} className="inline-flex items-center gap-2 rounded-2xl bg-[#7a2e2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7a2e2e]-dark disabled:opacity-60">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Launch Poll
          </button>
          {message ? <span className="text-sm font-medium text-emerald-600">Success: {message}</span> : null}
          {error ? <span className="text-sm font-medium text-rose-600">Error: {error}</span> : null}
        </div>
      </form>
    </section>
  );
}