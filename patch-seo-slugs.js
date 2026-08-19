const fs = require('fs');

// --- 1. ENHANCED POLL CARD (Smart Hashtag SEO Slug) ---
const cardFile = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let cardCode = fs.readFileSync(cardFile, 'utf8');

const slugLogic = `  // Enterprise SEO Slug Generator
  const seoSlug = useMemo(() => {
    if (poll.hashtags && poll.hashtags.length > 0) {
      return poll.hashtags.map(t => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(Boolean).join('-');
    }
    const stopWords = /\\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\\b/gi;
    const clean = poll.question.replace(stopWords, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    return \`\${(poll.category || 'poll').toLowerCase().replace(/_/g, '-')}-\${clean}\`.slice(0, 75).replace(/-$/, '');
  }, [poll]);
  const pollUrl = \`/poll/\${seoSlug}--\${poll.id}\`;\n\n`;

// Safely inject before the first useEffect
if (!cardCode.includes('const seoSlug = useMemo')) {
    cardCode = cardCode.replace(/(  useEffect\(\(\) => \{\n    let initialHasVoted)/, slugLogic + '$1');
    // Swap hardcoded UUID URLs to the new dynamic Keyword URLs
    cardCode = cardCode.replace(/\/poll\/\$\{poll\.id\}/g, '${pollUrl}');
    fs.writeFileSync(cardFile, cardCode);
}

// --- 2. POLL DETAIL CLIENT (Parse UUID for internal API routing) ---
const detailFile = 'apps/web/src/components/poll/PollDetailClient.tsx';
let detailCode = fs.readFileSync(detailFile, 'utf8');

if (!detailCode.includes('const actualPollId = useMemo')) {
    const detailParse = `export function PollDetailClient({ pollId, initialPoll }: PollDetailClientProps) {\n  const actualPollId = useMemo(() => pollId.includes('--') ? (pollId.split('--').pop() as string) : pollId, [pollId]);`;
    detailCode = detailCode.replace(/export function PollDetailClient\(\{ pollId, initialPoll \}: PollDetailClientProps\) \{/, detailParse);
    
    // Replace API endpoints to strictly use actualPollId instead of the URL string
    detailCode = detailCode.replace(/api\.get\(\`\/api\/v1\/polls\/\$\{pollId\}\`\)/g, 'api.get(`/api/v1/polls/${actualPollId}`)');
    detailCode = detailCode.replace(/api\.get\(\`\/api\/v1\/opinions\/\$\{pollId\}\/opinions/g, 'api.get(`/api/v1/opinions/${actualPollId}/opinions');
    detailCode = detailCode.replace(/api\.get\(\`\/api\/v1\/feed\/related\/\$\{pollId\}\?limit=4/g, 'api.get(`/api/v1/feed/related/${actualPollId}?limit=4');
    detailCode = detailCode.replace(/api\.get\(\`\/api\/v1\/votes\/\$\{pollId\}\/cohort/g, 'api.get(`/api/v1/votes/${actualPollId}/cohort');
    detailCode = detailCode.replace(/api\.post\(\`\/api\/v1\/polls\/\$\{pollId\}\/predict/g, 'api.post(`/api/v1/polls/${actualPollId}/predict');
    detailCode = detailCode.replace(/api\.post\(\`\/api\/v1\/opinions\/\$\{pollId\}\/opinion/g, 'api.post(`/api/v1/opinions/${actualPollId}/opinion');
    detailCode = detailCode.replace(/pollbooth-cohort:\$\{pollId\}/g, 'pollbooth-cohort:${actualPollId}');
    fs.writeFileSync(detailFile, detailCode);
}

// --- 3. SERVER COMPONENT (Next.js SEO Parsers) ---
const pageFile = 'apps/web/src/app/(platform)/poll/[id]/page.tsx';
if (fs.existsSync(pageFile)) {
    let pageCode = fs.readFileSync(pageFile, 'utf8');
    if (!pageCode.includes('split(\'--\').pop()')) {
        pageCode = pageCode.replace(/const poll = await fetchPoll\(params\.id\);/g, `const poll = await fetchPoll(params.id.includes('--') ? params.id.split('--').pop()! : params.id);`);
        fs.writeFileSync(pageFile, pageCode);
    }
}

// --- 4. OPEN GRAPH API (Edge Render UUID Parsing) ---
const ogFile = 'apps/web/src/app/(platform)/poll/[id]/opengraph-image.tsx';
if (fs.existsSync(ogFile)) {
    let ogCode = fs.readFileSync(ogFile, 'utf8');
    if (!ogCode.includes('split(\'--\').pop()')) {
        ogCode = ogCode.replace(/polls\/\$\{params\.id\}/g, 'polls/${params.id.includes(\'--\') ? params.id.split(\'--\').pop() : params.id}');
        fs.writeFileSync(ogFile, ogCode);
    }
}

console.log('Smart SEO Keyword Slugs injected successfully.');
