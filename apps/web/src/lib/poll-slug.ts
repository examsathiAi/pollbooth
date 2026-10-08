export type PollSlugInput = {
  id: string;
  question?: string;
  category?: string;
  slug?: string | null;
  hashtags?: string[] | null;
};

export function getPollSlug(poll: PollSlugInput): string {
  if (poll.slug) return poll.slug;
  if (poll.hashtags && poll.hashtags.length > 0) {
    const tagSlug = poll.hashtags
      .map((h) => h.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
      .filter(Boolean)
      .join("-");
    if (tagSlug) return tagSlug;
  }
  const q = (poll.question || "")
    .replace(/\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\b/gi, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return `${(poll.category || "poll").toLowerCase().replace(/_/g, "-")}-${q}`.slice(0, 75).replace(/-$/, "");
}
