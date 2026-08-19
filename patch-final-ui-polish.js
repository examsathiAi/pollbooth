const fs = require('fs');

// --- 1. REORDER DETAIL PAGE & FIX FAQ STYLING ---
const detailFile = 'apps/web/src/components/poll/PollDetailClient.tsx';
let detailCode = fs.readFileSync(detailFile, 'utf8');

// Extract the AI Summary block and remove it from the top
const summaryMatch = detailCode.match(/(\{\(poll as any\)\.ai_summary \? \([\s\S]*?\) : null\})/);
if (summaryMatch) {
    detailCode = detailCode.replace(summaryMatch[1], '');
    // Inject it immediately after the EnhancedPollCard
    detailCode = detailCode.replace(/(<EnhancedPollCard[^>]*\/>)/, `$1\n\n        {/* AI Context & Summary moved below the main poll */}\n        ${summaryMatch[1]}`);
}

// Fix the FAQ styling to match the AI Summary box
const faqOld = /<div className="mx-4 my-8 animate-in fade-in duration-500">[\s\S]*?<h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">[\s\S]*?<div className="space-y-3">/;
const faqNew = `<div className="mx-4 my-6 overflow-hidden rounded-3xl border border-paper-border/60 bg-transparent p-5 shadow-sm transition-all animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 border-b border-paper-border/40 pb-3">
              <Sparkles className="w-5 h-5 text-maroon" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-ink">Topic Deep Dive</h3>
            </div>
            <div className="space-y-4">`;
detailCode = detailCode.replace(faqOld, faqNew);
fs.writeFileSync(detailFile, detailCode);


// --- 2. FIX DUPLICATE BARS & FALSE SHARE BUTTON ---
const shareFile = 'apps/web/src/components/feed/ShareCardGenerator.tsx';
let shareCode = fs.readFileSync(shareFile, 'utf8');

// Completely rewrite the ShareCard UI to hide the capture area off-screen and clean up the buttons
const returnRegex = /return \([\s\S]*?\);\s*\}/;
const newReturn = `return (
    <div className="space-y-4 rounded-3xl border border-emerald-100 bg-[#f0fdf4] p-4 shadow-sm mt-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-emerald-200/50 pb-3">
        <div>
          <h3 className="text-sm font-bold text-emerald-950">Share this Poll</h3>
          <p className="text-xs text-emerald-800/80 mt-0.5">Export a card or copy the link directly</p>
        </div>
        <button onClick={handleCopyLink} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 transition-all active:scale-95">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Hidden Capture Area: Bypasses duplicate visual bars on the frontend but allows image generation */}
      <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none">
        <div ref={cardRef} style={{ backgroundColor: '#ffffff', padding: '24px', width: '600px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em', color: '#8a2a1b', marginBottom: '12px', textTransform: 'uppercase' }}>
            PollBooth Public Opinion
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.3, marginBottom: '24px', color: '#111827' }}>
            {title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chartItems.map((item) => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>
                  <span>{item.label}</span>
                  <span>{Math.round(item.value)}%</span>
                </div>
                <div style={{ height: '10px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: \`\${item.value}%\`, backgroundColor: '#10b981', borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
            <div>{voteCount ? \`\${voteCount.toLocaleString()} verified votes\` : "Live tracking active"}</div>
            <div style={{ color: '#8a2a1b' }}>pollbooth.com</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button onClick={() => openSocialUrl(\`https://api.whatsapp.com/send?text=\${encodeURIComponent((captions?.whatsapp || title) + "\\n\\n👉 Vote now: " + shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 transition-all active:scale-95">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button onClick={() => openSocialUrl(\`https://twitter.com/intent/tweet?text=\${encodeURIComponent(captions?.x || title)}&url=\${encodeURIComponent(shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
          <Sparkles className="h-4 w-4" /> X / Twitter
        </button>
        <button onClick={() => openSocialUrl(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(shareLink)}\`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition-all active:scale-95">
          <Share2 className="h-4 w-4" /> Facebook
        </button>
        <button onClick={handleNativeShare} disabled={isGenerating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
          <Download className="h-4 w-4" /> Save Card
        </button>
      </div>
    </div>
  );
}`;
shareCode = shareCode.replace(returnRegex, newReturn);
fs.writeFileSync(shareFile, shareCode);


// --- 3. FORCE TACTILE CSS ON VOTE BUTTONS ---
const pollCardFile = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let pollCardCode = fs.readFileSync(pollCardFile, 'utf8');

// Inject guaranteed standard Tailwind transform/hover utility classes
const badClassRegex = /className=\{\`group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ease-out active:scale-\[0\.98\] \$\{[\s\S]*?\}\`\}/;
const newClassStr = `className={\`group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ease-out transform hover:-translate-y-1 active:scale-95 cursor-pointer \${
                  selectedOptionIndex === idx || userVoteIndex === idx
                    ? 'border-maroon bg-maroon/5 text-maroon shadow-md ring-1 ring-maroon/20'
                    : 'border-paper-border/80 bg-white text-ink hover:border-maroon/40 hover:bg-maroon/5 hover:shadow-lg'
                }\`}`;
pollCardCode = pollCardCode.replace(badClassRegex, newClassStr);
fs.writeFileSync(pollCardFile, pollCardCode);

console.log('Layout reversed, FAQ styled, Duplicate Bars hidden, and Hover effects hardcoded.');
