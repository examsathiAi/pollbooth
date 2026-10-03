import type { Metadata } from "next";
import { headers } from "next/headers";
import { PollDetailClient } from "@/components/poll/PollDetailClient";
import { SharedPollLanding } from "@/components/poll/SharedPollLanding";
import Script from "next/script";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Poll = {
  id: string;
  question: string;
  category: string;
  seo_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  keywords?: string[] | null;
  hashtags?: string[] | null;
  total_votes?: number;
  total_opinions?: number;
  image_url?: string | null;
  created_at?: string;
};

function trimTo(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.replace(/[ ,:;-]+$/, "") + "...";
}
async function fetchPoll(pollId: string) {
  const res = await fetch(`${API_URL}/api/v1/polls/${pollId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Poll;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const poll = await fetchPoll(params.id.includes('--') ? params.id.split('--').pop()! : params.id);
  
  // Dynamically resolve the true server domain/IP to prevent Facebook's localhost loopback failure
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const dynamicSiteUrl = SITE_URL.startsWith("http://localhost") ? `${protocol}://${host}` : SITE_URL;

  if (!poll) return { title: "PollBooth", description: "Vote on PollBooth" };

  const seoRaw = poll.seo_title?.trim() || "";
  const title = seoRaw && seoRaw.length < 60 ? seoRaw : `${trimTo(poll.question, 52)} | PollBooth`;
  
  // Feed Facebook the rich AI summary for maximum click-through rate
  const baseDesc = (poll as any).ai_summary?.substring(0, 140) || poll.meta_description?.trim() || `Vote on this poll and see live results for ${poll.category}.`;
  const allHashtags = (poll.hashtags && poll.hashtags.length > 0) ? poll.hashtags : ["#pollbooth"];
  const formattedTags = allHashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ');
  const description = `${baseDesc} ${formattedTags}`;
  const ogRaw = poll.og_title?.trim() || "";
  const openGraphTitle = ogRaw && ogRaw.length < 60 ? ogRaw : trimTo(poll.question, 72);
  const rawOptions: string[] = Array.isArray((poll as any).options)
    ? (poll as any).options
    : Array.isArray((poll as any).results)
      ? (poll as any).results.map((r: any) => r.option)
      : [];
  const optionTeaser = rawOptions.slice(0, 4).join(" / ");
  const openGraphDescription = trimTo(optionTeaser ? `Vote karo: ${optionTeaser}. Ek tap mein vote, result turant.` : "Vote karo aur result turant dekho.", 150);

  // We dynamically generate an Open Graph image on the fly with the poll question using a free API (No /api/og file required)
  const encodedTitle = encodeURIComponent(poll.question.substring(0, 75) + (poll.question.length > 75 ? '...' : ''));
  const dynamicOgImage = `https://placehold.co/1200x630/fdfbf7/1f1b18.png?text=${encodedTitle}%0A%0A%E2%86%92+Vote+on+PollBooth`;

  return {
    title,
    description,
    keywords: poll.keywords || undefined,
    openGraph: {
      title: openGraphTitle,
      description: openGraphDescription,
      url: `${dynamicSiteUrl}/poll/${params.id}`,
      images: [{ url: poll.image_url || `${dynamicSiteUrl}/og-card.png`, width: 1200, height: 630, alt: poll.question }],
      type: "article",
      
    },
    twitter: {
      card: "summary_large_image",
      images: [poll.image_url || `${dynamicSiteUrl}/og-card.png`],
      title: openGraphTitle,
      description: openGraphDescription,
      
    }
  };
}

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const poll = await fetchPoll(params.id.includes('--') ? params.id.split('--').pop()! : params.id);

  if (!poll) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-600">
        This poll could not be loaded right now.
      </div>
    );
  }

  // Generate JSON-LD structured data for search engines
  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: poll.seo_title || poll.question,
    description: poll.og_description || poll.meta_description || `Vote on this poll and see live results`,
    url: `${SITE_URL}/poll/${params.id}`,
    author: {
      "@type": "Organization",
      name: "PollBooth",
      url: SITE_URL,
    },
    image: {
      "@type": "ImageObject",
      url: poll.image_url || `${SITE_URL}/og-card.png`,
    },
    mainEntity: {
      "@type": "Poll",
      name: poll.question,
      description: poll.og_description || poll.meta_description,
      category: poll.category,
      interactionCount: poll.total_votes || 0,
      datePublished: poll.created_at,
    },
    keywords: poll.keywords?.join(", ") || undefined,
    inLanguage: "en-US",
    isAccessibleForFree: true,
  };

  return (
    <>
      <Script
        id="poll-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLD),
        }}
        strategy="afterInteractive"
      />
      <SharedPollLanding
      poll={poll as any}
      insights={<PollDetailClient pollId={params.id} initialPoll={poll} isModalView={true} />}
    />
    </>
  );
}
