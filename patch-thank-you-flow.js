const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// The regex targeting the basic banner we injected in the previous step
const oldBannerRegex = /\{redirectCountdown !== null && \(\s*<div className="mx-4 mt-4 flex items-center justify-between[\s\S]*?<\/button>\s*<\/div>\s*\)\}/;

// The new, comprehensive "Thank You" banner with explicit instructions and the Comment trigger
const newBanner = `{redirectCountdown !== null && (
        <div className="mx-4 mt-5 flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-[#f0fdf4] p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950 tracking-tight">Thank you for voting!</h4>
              <p className="text-sm font-semibold text-emerald-800 mt-0.5">Your vote has been registered.</p>
              <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                You can express your views from the comments section below. If you choose not to, you will be led to other polls in <span className="font-bold px-1.5 py-0.5 bg-emerald-200/50 rounded text-emerald-900">{redirectCountdown}s</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-2 border-t border-emerald-200/60 pt-4">
            <button
              onClick={() => setRedirectCountdown(null)}
              className="rounded-xl bg-emerald-200/50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-300 active:scale-95"
            >
              Wait, stay here
            </button>
            <button
              onClick={() => {
                setRedirectCountdown(null);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 shadow-sm"
            >
              Express my views
            </button>
          </div>
        </div>
      )}`;

if (code.match(oldBannerRegex)) {
    code = code.replace(oldBannerRegex, newBanner);
    console.log('Successfully replaced old banner with the comprehensive Thank You flow.');
} else {
    // Fallback injection just in case the regex misses due to formatting
    code = code.replace(/(<main>)/, '$1\n      ' + newBanner);
    console.log('Successfully injected the comprehensive Thank You flow.');
}

fs.writeFileSync(file, code);
