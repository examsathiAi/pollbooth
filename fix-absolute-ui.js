const fs = require('fs');

// 1. FIX THE LAYOUT FLOW: Move Share Menu to the absolute bottom (Facebook Style)
const cardFile = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let cardCode = fs.readFileSync(cardFile, 'utf8');

// Highly permissive match to extract the share menu regardless of whitespace
const shareRegex = /\{\s*showShareMenu\s*&&\s*\([\s\S]*?<ShareCardGenerator[\s\S]*?\/>\s*<\/div>\s*\)\s*\}/;
const match = cardCode.match(shareRegex);

if (match) {
    cardCode = cardCode.replace(shareRegex, ''); // Strip it from the middle
    
    // Inject it immediately after the bottom action bar
    const actionBarRegex = /(<div className="flex items-center justify-between gap-2 border-t border-paper-border\/60 px-5 py-3 bg-transparent">[\s\S]*?<\/div>\s*<\/div>)/;
    cardCode = cardCode.replace(actionBarRegex, `$1\n\n      {/* Facebook-style Bottom Share Menu */}\n      ${match[0]}`);
    fs.writeFileSync(cardFile, cardCode);
}

// 2. PURGE THE GREEN UI: Make it a sleek, borderless Facebook-style inline menu
const shareFile = 'apps/web/src/components/feed/ShareCardGenerator.tsx';
let shareCode = fs.readFileSync(shareFile, 'utf8');

// Strip the jarring green background and make it clean white
shareCode = shareCode.replace(/bg-\[#f0fdf4\]/g, 'bg-white');
shareCode = shareCode.replace(/border-emerald-100/g, 'border-paper-border/30');

// Remove the redundant "Share this poll" header completely to match FB inline UI
shareCode = shareCode.replace(/<div className="flex items-center justify-between border-b border-emerald-200\/50 pb-3">[\s\S]*?<\/button>\s*<\/div>/, '');

// Neutralize all button colors to brand theme
shareCode = shareCode.replace(/text-emerald-700/g, 'text-ink');
shareCode = shareCode.replace(/hover:bg-emerald-50/g, 'hover:bg-ink/5');
shareCode = shareCode.replace(/bg-emerald-600/g, 'bg-ink');
shareCode = shareCode.replace(/hover:bg-emerald-700/g, 'hover:bg-ink/80');

// Bulletproof hiding of the duplicate bars using strict React inline styles
shareCode = shareCode.replace(/className="absolute -left-\[9999px\] top-0 opacity-0 pointer-events-none"/, 'style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}');

fs.writeFileSync(shareFile, shareCode);


// 3. FORCE THE SEO URL: Silent Address Bar Enforcer
const detailFile = 'apps/web/src/components/poll/PollDetailClient.tsx';
let detailCode = fs.readFileSync(detailFile, 'utf8');

if (!detailCode.includes('window.history.replaceState')) {
    const enforcer = `
  useEffect(() => {
    if (poll?.id && poll?.question && typeof window !== 'undefined') {
      const clean = poll.question.replace(/\\b(will|is|are|the|to|a|an|in|on|of|for|with|and|or|do|does|what|how|why|can)\\b/gi, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const slug = \`\${(poll.category || 'poll').toLowerCase().replace(/_/g, '-')}-\${clean}\`.slice(0, 75).replace(/-$/, '');
      const targetPath = \`/poll/\${slug}--\${poll.id}\`;
      // Instantly rewrite the browser address bar if it detects a naked UUID
      if (window.location.pathname !== targetPath && !window.location.pathname.includes(slug)) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [poll?.id, poll?.question, poll?.category]);\n`;
    
    // Inject directly below the router declaration
    detailCode = detailCode.replace(/(const router = useRouter\(\);\n)/, `$1${enforcer}`);
    fs.writeFileSync(detailFile, detailCode);
}

console.log('Absolute fixes applied: Share block relocated, colors neutralized, SEO enforcer active.');
