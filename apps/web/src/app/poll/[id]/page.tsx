import type { Metadata } from "next";
import { PollDetailClient } from "@/components/poll/PollDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchPoll(pollId: string) {
  const res = await fetch(`${API_URL}/api/v1/polls/${pollId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
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
    };
  }

  return {
    title: `${poll.question} | Pulse`,
    description: `Vote on this poll and see live results for ${poll.category}.`,
    openGraph: {
      title: `${poll.question} | Pulse`,
      description: `Vote on this poll and see live results for ${poll.category}.`,
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
