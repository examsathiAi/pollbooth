const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

const enforcerLogic = `
  // Canonical URL Enforcer: Silently rewrites naked UUID links to SEO keyword slugs instantly
  useEffect(() => {
    if (poll?.id && poll?.question && typeof window !== 'undefined') {
      let slug = "";
      if (poll.hashtags && poll.hashtags.length > 0) {
        slug = poll.hashtags.map((t: string) => t.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).filter(Boolean).join('-');
      } else {
        const stopWords = /\\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\\b/gi;
        const clean = poll.question.replace(stopWords, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        slug = \`\${(poll.category || 'poll').toLowerCase().replace(/_/g, '-')}-\${clean}\`.slice(0, 75).replace(/-$/, '');
      }
      const targetPath = \`/poll/\${slug}--\${poll.id}\`;
      
      // If the URL in the browser doesn't match the optimized SEO target, rewrite it cleanly
      if (window.location.pathname !== targetPath && !window.location.pathname.includes(slug)) {
        window.history.replaceState({ ...window.history.state, as: targetPath, url: targetPath }, '', targetPath);
      }
    }
  }, [poll?.id, poll?.question, poll?.category, poll?.hashtags]);
`;

// Inject safely after the initial data load effect
if (!code.includes('Canonical URL Enforcer')) {
    code = code.replace(/(const load = async \(\) => \{[\s\S]*?\}, \[poll\?\.id, pollId, loadPoll\]\);)/, `$1\n${enforcerLogic}`);
    fs.writeFileSync(file, code);
    console.log('Canonical URL Enforcer successfully injected.');
} else {
    console.log('Enforcer already present.');
}
