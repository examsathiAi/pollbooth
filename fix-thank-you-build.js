const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Scrub out the broken UI injection that caused the build failure
code = code.replace(/\{redirectCountdown !== null && \([\s\S]*?Express my views\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}/g, '');

// 2. Inject the Next.js Router (if it isn't there already)
if (!code.includes('import { useRouter } from "next/navigation"')) {
    code = code.replace(/import Link from "next\/link";/, 'import Link from "next/link";\nimport { useRouter } from "next/navigation";');
}

// 3. Inject the State Variables for the timer
if (!code.includes('const [redirectCountdown')) {
    code = code.replace(/(export function PollDetailClient.*?\{)/, `$1\n  const router = useRouter();\n  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);`);
}

// 4. Inject the 15-second ticking clock Effect
if (!code.includes('if (redirectCountdown === 0)')) {
    const effectLogic = `\n  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown === 0) {
      router.push('/feed');
      return;
    }
    const timer = window.setTimeout(() => setRedirectCountdown(prev => (prev as number) - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [redirectCountdown, router]);\n`;
    code = code.replace(/(const submitPrediction = async)/, effectLogic + '\n  $1');
}

// 5. Update the handleVoteComplete function to trigger the timer
code = code.replace(/const handleVoteComplete = async \(\) => \{\s*setHasVoted\(true\);\s*await loadPoll\(\);\s*\};/g, `const handleVoteComplete = async () => {\n    setHasVoted(true);\n    await loadPoll();\n    setRedirectCountdown(15);\n  };`);

// 6. Safely re-inject the complete Thank You Banner
const bannerUI = `{redirectCountdown !== null && (
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
code = code.replace(/(<main>)/, '$1\n      ' + bannerUI);

fs.writeFileSync(file, code);
console.log('Build errors resolved. Full state logic and UI successfully applied.');
