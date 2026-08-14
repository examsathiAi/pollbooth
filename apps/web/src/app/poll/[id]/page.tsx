import type { Metadata } from "next";
import { PollDetailClient } from "@/components/poll/PollDetailClient";
import { Script } from "next/script";

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
  created_at?: string;
};

async function fetchPoll(pollId: string) {
  const res = await fetch(`${API_URL}/api/v1/polls/${pollId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Poll;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const poll = await fetchPoll(params.id);

  if (!poll) {
    return {
      title: "Pulse poll | Pulse",
      description: "Vote on the poll and see live public opinion.",
      openGraph: {
        title: "Pulse poll | Pulse",
        description: "Vote on the poll and see live public opinion.",
        type: "website",
        images: ["/og-card.png"],
      },
      alternates: {
        canonical: `${SITE_URL}/poll/${params.id}`,
      },
    };
  }

  const title = poll.seo_title?.trim() || `${poll.question} | Pulse`;
  const description = poll.meta_description?.trim() || `Vote on this poll and see live results for ${poll.category}.`;
  const openGraphTitle = poll.og_title?.trim() || poll.seo_title?.trim() || title;
  const openGraphDescription = poll.og_description?.trim() || poll.meta_description?.trim() || description;

  return {
    title,
    description,
    keywords: poll.keywords || undefined,
    openGraph: {
      title: openGraphTitle,
      description: openGraphDescription,
      type: "article",
      images: ["/og-card.png"],
    },
  };
}

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const poll = await fetchPoll(params.id);

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
      name: "Pulse",
      url: SITE_URL,
    },
    image: {
      "@type": "ImageObject",
      url: `${SITE_URL}/og-card.png`,
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
      <PollDetailClient pollId={params.id} initialPoll={poll} />
    </>
  );
}
