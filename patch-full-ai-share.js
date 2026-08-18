const fs = require('fs');

// --- 1. BACKEND: Expose AI fields in Feed Service ---
const feedFile = 'apps/api/src/modules/feed/feed.service.ts';
let feedCode = fs.readFileSync(feedFile, 'utf8');
feedCode = feedCode.replace(
  /hashtags:\s*poll\.hashtags\s*\|\|\s*\[\],/g,
  `hashtags: poll.hashtags || [],
      whatsapp_share_text: poll.whatsapp_share_text || null,
      x_caption: poll.x_caption || null,
      facebook_caption: poll.facebook_caption || null,`
);
fs.writeFileSync(feedFile, feedCode);

// --- 2. BACKEND: Expose AI fields in Polls Service ---
const pollsFile = 'apps/api/src/modules/polls/polls.service.ts';
let pollsCode = fs.readFileSync(pollsFile, 'utf8');
pollsCode = pollsCode.replace(
  /hashtags:\s*poll\.hashtags\s*\|\|\s*\[\],/g,
  `hashtags: poll.hashtags || [],
      whatsapp_share_text: poll.whatsapp_share_text || null,
      x_caption: poll.x_caption || null,
      facebook_caption: poll.facebook_caption || null,`
);
fs.writeFileSync(pollsFile, pollsCode);

// --- 3. FRONTEND: Update PollCard to pass AI fields down ---
const cardFile = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let cardCode = fs.readFileSync(cardFile, 'utf8');

// Update Interface
cardCode = cardCode.replace(
  /created_at\?:\s*string;/g,
  `created_at?: string;
    whatsapp_share_text?: string | null;
    x_caption?: string | null;
    facebook_caption?: string | null;
    hashtags?: string[] | null;`
);

// Update Component Injection
cardCode = cardCode.replace(
  /<ShareCardGenerator\s*title=\{poll\.question\}[\s\S]*?shareUrl=\{`\$\{typeof window !== 'undefined' \? window\.location\.origin : ''\}\/poll\/\$\{poll\.id\}`\}\s*\/>/g,
  `<ShareCardGenerator
            title={poll.question}
            voteCount={animatedVotes}
            resultData={results.map((r) => ({ label: r.option, value: r.percentage || 0 }))}
            shareUrl={\`\${typeof window !== 'undefined' ? window.location.origin : ''}/poll/\${poll.id}\`}
            hashtags={poll.hashtags || []}
            captions={{
              whatsapp: poll.whatsapp_share_text || undefined,
              x: poll.x_caption || undefined,
              facebook: poll.facebook_caption || undefined
            }}
          />`
);
fs.writeFileSync(cardFile, cardCode);

// --- 4. FRONTEND: Update ShareCardGenerator to use AI fields & Cache Bust Facebook ---
const shareGenFile = 'apps/web/src/components/feed/ShareCardGenerator.tsx';
let shareGenCode = fs.readFileSync(shareGenFile, 'utf8');

// Add hashtags to interface
shareGenCode = shareGenCode.replace(
  /captions\?:\s*\{\s*whatsapp\?:\s*string;\s*x\?:\s*string;\s*facebook\?:\s*string;\s*\};/g,
  `captions?: { whatsapp?: string; x?: string; facebook?: string; };
  hashtags?: string[];`
);

// Add hashtags to destructured props
shareGenCode = shareGenCode.replace(
  /export function ShareCardGenerator\(\{ title, voteCount, resultData, shareUrl, captions \}: ShareCardGeneratorProps\) \{/g,
  `export function ShareCardGenerator({ title, voteCount, resultData, shareUrl, captions, hashtags }: ShareCardGeneratorProps) {`
);

// Inject logic to combine AI captions with AI hashtags, and add Facebook Cache-Buster
const oldButtons = /<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">[\s\S]*?<\/div>/;
const newButtons = `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
        <button onClick={() => {
          const waText = captions?.whatsapp ? \`\${captions.whatsapp} \${(hashtags || []).map(h => '#'+h).join(' ')}\`.trim() : title;
          openSocialUrl(\`https://api.whatsapp.com/send?text=\${encodeURIComponent(waText + "\\n\\n👉 Vote now: " + shareLink)}\`);
        }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button onClick={() => {
          const xText = captions?.x ? \`\${captions.x} \${(hashtags || []).map(h => '#'+h).join(' ')}\`.trim() : title;
          openSocialUrl(\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(xText)}&url=\${encodeURIComponent(shareLink)}\`);
        }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200">
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button onClick={() => {
          /* Appending ?v=timestamp forces Facebook to scrape fresh data instead of using its broken cached memory */
          openSocialUrl(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(shareLink + "?v=" + Date.now())}\`);
        }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100">
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button onClick={handleNativeShare} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon px-3 py-3 text-xs font-bold text-white hover:bg-[#6b1e13] transition-colors shadow-sm disabled:opacity-50">
          <Download className="h-4 w-4" /> Export Image
        </button>
      </div>`;

shareGenCode = shareGenCode.replace(oldButtons, newButtons);
fs.writeFileSync(shareGenFile, shareGenCode);

console.log('Full AI Pipeline and Share Cache-Busting applied successfully.');
