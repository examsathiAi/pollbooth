const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Move the Share Menu below the Action Bar to keep the Vote buttons at the top
const shareBlockRegex = /\{showShareMenu && \([\s\S]*?<\/ShareCardGenerator>\s*<\/div>\s*\)\}/;
const shareBlockMatch = code.match(shareBlockRegex);

if (shareBlockMatch) {
    code = code.replace(shareBlockRegex, ''); // Remove from the middle
    
    // Inject it immediately after the bottom action bar
    const actionBarRegex = /(<div className="flex items-center justify-between gap-2 border-t border-paper-border\/60 px-5 py-3 bg-transparent">[\s\S]*?<\/div>\s*<\/div>)/;
    code = code.replace(actionBarRegex, `$1\n\n      {/* Share Menu correctly placed below the poll */}\n      ${shareBlockMatch[0]}`);
}

// 2. Simplify the hover state so it guarantees a visual change when the mouse moves over it
code = code.replace(/border-paper-border\/80 bg-white text-ink hover:border-maroon\/40 hover:bg-maroon\/5 hover:shadow-lg/g, 'border-paper-border/80 bg-transparent text-ink hover:border-ink/30 hover:bg-ink/5 hover:shadow-sm');

fs.writeFileSync(file, code);
console.log('Poll Flow fixed: Share menu moved to bottom, hover states simplified.');
