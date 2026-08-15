"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, Share2, Sparkles, Users, PieChart as PieChartIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface InsightDetail {
  id: string;
  headline: string;
  content: string;
  created_at: string;
  demographics_summary?: { key_takeaway?: string; dominant_age_group?: string; };
  poll: { id: string; question: string; category: string; options: string[]; total_votes: number; total_opinions: number; };
}

// Map categories to high-quality editorial images and specific chart colors
const categoryConfig: Record<string, { image: string, colors: string[] }> = {
  civic: { image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=2070&auto=format&fit=crop", colors: ["#0891b2", "#164e63", "#67e8f9", "#0e7490"] },
  sports: { image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop", colors: ["#ea580c", "#7c2d12", "#fdba74", "#c2410c"] },
  bollywood: { image: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=2056&auto=format&fit=crop", colors: ["#c026d3", "#701a75", "#f0abfc", "#a21caf"] },
  news: { image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop", colors: ["#059669", "#064e3b", "#6ee7b7", "#047857"] },
  default: { image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop", colors: ["#57534e", "#292524", "#d6d3d1", "#44403c"] },
};

export default function InsightArticlePage() {
  const params = useParams();
  const id = params?.id as string;
  const [insight, setInsight] = useState<InsightDetail | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    
    const loadData = async () => {
      try {
        const insightRes = await api.get(`/api/v1/feed/insights/${id}`);
        const insightData = insightRes.data;
        setInsight(insightData);

        try {
          const pollRes = await api.get(`/api/v1/polls/${insightData.poll.id}`);
          if (pollRes.data?.results) {
            const formattedData = pollRes.data.results.map((r: any) => ({
              name: r.option.length > 20 ? r.option.substring(0, 20) + "..." : r.option,
              fullOption: r.option,
              value: r.count,
              percentage: r.percentage
            }));
            setChartData(formattedData);
          }
        } catch (pollErr) {
          console.warn("Could not load secondary poll data for charts");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-paper-bg"><Loader2 className="h-8 w-8 animate-spin text-maroon" /></div>;
  if (error || !insight) return <div className="p-10 text-center font-semibold text-ink">{error || "Report not found"}</div>;

  const config = categoryConfig[insight.poll.category?.toLowerCase()] || categoryConfig.default;

  return (
    <div className="min-h-screen bg-paper-bg pb-20 font-sans">
      <header className="border-b border-paper-border/30 bg-paper-bg/80 backdrop-blur-md p-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/feed" className="inline-flex items-center gap-2 text-sm text-ink font-bold hover:text-maroon transition-colors"><ArrowLeft className="h-4 w-4"/> Back to Feed</Link>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="p-2 text-ink-muted hover:text-ink"><Share2 className="h-4 w-4" /></button>
        </div>
      </header>
      
      {/* Editorial Hero Banner */}
      <div className="w-full h-[40vh] min-h-[300px] relative">
        <img src={config.image} alt="Article Header" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10">
          <div className="max-w-4xl mx-auto">
            <span className="inline-block px-3 py-1 mb-4 rounded-sm bg-maroon text-white text-[10px] font-bold uppercase tracking-widest">
              {insight.poll.category.replace(/_/g, " ")} • Exit Poll Analysis
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-headline text-white leading-tight drop-shadow-lg">
              {insight.headline}
            </h1>
          </div>
        </div>
      </div>
      
      <main className="mx-auto max-w-4xl p-6 sm:p-10 -mt-8 relative z-20 bg-paper-bg rounded-t-3xl border border-paper-border/20 shadow-sm">
        
        <div className="flex flex-wrap gap-6 text-xs font-bold uppercase tracking-widest text-ink-muted mb-10 pb-6 border-b border-paper-border/30">
          <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-maroon"/> {new Date(insight.created_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-2"><Users className="h-4 w-4 text-maroon"/> {insight.poll.total_votes.toLocaleString()} Participants</span>
        </div>
        
        <div className="grid md:grid-cols-12 gap-10">
          {/* Main Article Content */}
          <div className="md:col-span-7 lg:col-span-8">
            <div className="mb-8 p-6 bg-paper-card border-l-4 border-ink rounded-r-xl">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">The Catalyst Question</p>
              <p className="text-xl sm:text-2xl font-serif font-semibold text-ink leading-snug">&ldquo;{insight.poll.question}&rdquo;</p>
            </div>

            <div 
              className="prose prose-lg prose-stone max-w-none text-ink/85 space-y-6 leading-relaxed font-serif" 
              dangerouslySetInnerHTML={{ __html: insight.content }} 
            />
          </div>

          {/* Right Rail Data Visuals */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            
            {insight.demographics_summary?.key_takeaway && (
              <div className="p-6 bg-maroon/5 border border-maroon/20 rounded-2xl">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-maroon mb-3"><Sparkles className="h-4 w-4"/> AI Insight</span>
                <p className="font-semibold text-ink leading-relaxed text-sm">{insight.demographics_summary.key_takeaway}</p>
              </div>
            )}

            {/* Recharts Donut Chart */}
            {chartData.length > 0 && (
              <div className="p-6 border border-paper-border/40 rounded-2xl bg-white shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-ink">
                  <PieChartIcon className="h-4 w-4 text-maroon" /> Voter Consensus
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value) => [`${Array.isArray(value) ? value.join(", ") : value ?? 0} votes`, 'Count']}
                        labelFormatter={() => ""}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '600' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}