const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the Share button from the top right header
const topShareRegex = /<div>\s*<button onClick=\{\(\) => setShowShareMenu\(!showShareMenu\)\} className="rounded-full p-1\.5 text-ink-muted hover:bg-ink\/5 hover:text-ink transition-colors duration-200">\s*<Share2 className="h-4 w-4" \/>\s*<\/button>\s*\{showShareMenu && \([\s\S]*?Copy link<\/button>\s*<\/div>\s*\)\}\s*<\/div>/;
code = code.replace(topShareRegex, '');

// 2. Append the Share button to the bottom action bar next to Comments
const bottomBarTarget = /<button onClick=\{\(\) => setShowComments\(!showComments\)\} className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1\.5 transition-colors">\s*<MessageCircle className="w-4 h-4" \/>\s*\{opinionsTotal\.toLocaleString\(\)\} \{opinionsTotal === 1 \? 'comment' : 'comments'\}\s*<\/button>/;

const newBottomBar = `<button onClick={() => setShowComments(!showComments)} className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors">
            <MessageCircle className="w-4 h-4" />
            {opinionsTotal.toLocaleString()} {opinionsTotal === 1 ? 'comment' : 'comments'}
          </button>
          <div className="relative flex items-center">
            <button onClick={() => setShowShareMenu(!showShareMenu)} className="text-xs font-medium text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            {showShareMenu && (
              <div className="absolute left-0 bottom-8 z-30 w-36 rounded-2xl border border-paper-border bg-paper-bg shadow-lg py-1.5 overflow-hidden transition-all duration-200">
                <button onClick={async () => { try { const url = \`\${typeof window !== 'undefined' ? window.location.origin : ''}/poll/\${poll.id}\`; await navigator.clipboard.writeText(url); setShowSharePrompt(true); setTimeout(() => setShowSharePrompt(false), 2000); setShowShareMenu(false); } catch {} }} className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5 transition-colors">Copy link</button>
              </div>
            )}
          </div>`;

code = code.replace(bottomBarTarget, newBottomBar);

fs.writeFileSync(file, code);
console.log('Share button relocated to bottom bar successfully.');
