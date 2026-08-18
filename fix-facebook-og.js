const fs = require('fs');
const file = 'apps/web/src/app/poll/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Inject headers for dynamic domain resolution
if (!code.includes('import { headers }')) {
    code = code.replace(/import type \{ Metadata \} from "next";/, 'import type { Metadata } from "next";\nimport { headers } from "next/headers";');
}

// 2. completely rewrite the metadata generator to fix the localhost bug and inject the dynamic image API
const metaRegex = /export async function generateMetadata[\s\S]*?(?=export default async function)/;

const newMeta = `export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const poll = await fetchPoll(params.id);
  
  // Dynamically resolve the true server domain/IP to prevent Facebook's localhost loopback failure
  const headersList = headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const dynamicSiteUrl = \`\${protocol}://\${host}\`;

  if (!poll) return { title: "PollBooth", description: "Vote on PollBooth" };

  const title = poll.seo_title?.trim() || \`\${poll.question} | PollBooth\`;
  
  // Feed Facebook the rich AI summary for maximum click-through rate
  const description = (poll as any).ai_summary?.substring(0, 160) || poll.meta_description?.trim() || \`Vote on this poll and see live results for \${poll.category}.\`;
  const openGraphTitle = poll.og_title?.trim() || poll.seo_title?.trim() || poll.question;
  const openGraphDescription = poll.og_description?.trim() || description;

  // We dynamically generate an Open Graph image on the fly with the poll question using a free API (No /api/og file required)
  const encodedTitle = encodeURIComponent(poll.question.substring(0, 75) + (poll.question.length > 75 ? '...' : ''));
  const dynamicOgImage = \`https://placehold.co/1200x630/fdfbf7/1f1b18.png?text=\${encodedTitle}%0A%0A%E2%86%92+Vote+on+PollBooth\`;

  return {
    title,
    description,
    keywords: poll.keywords || undefined,
    openGraph: {
      title: openGraphTitle,
      description: openGraphDescription,
      url: \`\${dynamicSiteUrl}/poll/\${params.id}\`,
      type: "article",
      images: [{ url: dynamicOgImage, width: 1200, height: 630, alt: poll.question }],
    },
    twitter: {
      card: "summary_large_image",
      title: openGraphTitle,
      description: openGraphDescription,
      images: [dynamicOgImage],
    }
  };
}

`;

code = code.replace(metaRegex, newMeta);
fs.writeFileSync(file, code);
console.log('Facebook Open Graph Localhost loopback fixed!');
