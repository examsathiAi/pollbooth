const fs = require('fs');
const file = 'apps/web/src/components/feed/PollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Upgrade the Card Wrapper (Isolation, Shadow, and Rounded Corners)
code = code.replace(
  /<article className="border-b border-slate-100 bg-white p-4">/,
  '<article className="mb-6 overflow-hidden rounded-3xl border border-[#d8ceb8]/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(31,27,24,0.06)] transition-shadow duration-300 hover:shadow-[0_8px_24px_-4px_rgba(31,27,24,0.08)]">'
);

// 2. Refine the Meta Badges (Softer, classier tags)
code = code.replace(/bg-maroon\/10[\s\S]*?text-maroon/, 'bg-[#7a2e2e]/5 text-[#7a2e2e]');
code = code.replace(/border-slate-200[\s\S]*?text-slate-500/, 'border-[#d8ceb8]/50 text-[#625a50]');

// 3. Upgrade the Typography
code = code.replace(
  /<h2 className="mb-3 text-\[17px\] font-semibold leading-6 text-slate-900">/,
  '<h2 className="mb-4 text-[18px] font-bold leading-relaxed text-[#1f1b18] tracking-tight">'
);

// 4. Upgrade the Voting Buttons (Fluid physics and larger touch targets)
code = code.replace(
  /w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:border-maroon\/30 hover:bg-maroon\/5 active:scale-\[0.99\] disabled:opacity-60/g,
  'relative w-full overflow-hidden rounded-2xl border border-[#d8ceb8] bg-white px-5 py-4 text-left text-[15px] font-semibold text-[#1f1b18] transition-all duration-300 ease-out hover:border-[#7a2e2e]/40 hover:bg-[#7a2e2e]/[0.02] hover:shadow-sm active:scale-[0.98] disabled:opacity-60'
);

// 5. Strip the Rainbow Gradients and apply Classy Brand Colors for Results
const oldToneLogic = `const toneClasses = [
              "from-blue-500 to-cyan-500",
              "from-emerald-500 to-lime-500",
              "from-amber-500 to-orange-500",
              "from-violet-500 to-fuchsia-500",
              "from-rose-500 to-pink-500",
            ];
            const barClass = toneClasses[idx % toneClasses.length];`;
            
const newToneLogic = `const barClass = isUserChoice ? "bg-[#7a2e2e]" : "bg-[#e8e2d5]";`;

code = code.replace(oldToneLogic, newToneLogic);

// 6. Fix the Result Bar HTML to use the new solid colors
code = code.replace(
  /className={\`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out \$\{barClass\} \$\{isUserChoice \? "shadow-\[0_0_0_2px_rgba\(37,99,235,0\.12\)\]" : ""\}\`}/,
  'className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`}'
);
code = code.replace(/bg-slate-100/g, 'bg-[#f4efe7]');

// 7. Refine the Share/Action Bar (Blend it into the classy theme)
code = code.replace(
  /rounded-2xl border border-slate-100 bg-slate-50\/70 px-3 py-2/,
  'rounded-2xl border border-[#d8ceb8]/40 bg-[#f4efe7]/30 px-3 py-2.5'
);

fs.writeFileSync(file, code);
console.log("✅ Premium UI applied: Layout remains identical, Tailwind skin upgraded.");
