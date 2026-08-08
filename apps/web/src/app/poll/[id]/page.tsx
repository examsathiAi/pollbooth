import type { Metadata } from "next";
import { PollDetailClient } from "@/components/poll/PollDetailClient";

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

  return <PollDetailClient pollId={params.id} initialPoll={poll} />;
}
