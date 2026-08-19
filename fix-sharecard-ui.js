const fs = require('fs');
const file = 'apps/web/src/components/feed/ShareCardGenerator.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the redundant "Share this Poll" / "Copy Link" header from inside the generator
code = code.replace(/<div className="flex items-center justify-between border-b border-emerald-200\/50 pb-3">[\s\S]*?<\/div>/, '');

// 2. Change the jarring green background to a seamless, transparent brand theme
code = code.replace(/className="space-y-4 rounded-3xl border border-emerald-100 bg-\[#f0fdf4\] p-4 shadow-sm mt-4 animate-in fade-in duration-300"/, 'className="space-y-4 rounded-2xl border border-paper-border/60 bg-transparent p-4 mt-4 animate-in fade-in duration-300"');

// 3. Force the capture area completely off-screen using strict inline styles so duplicate bars NEVER appear
code = code.replace(/className="absolute -left-\[9999px\] top-0 opacity-0 pointer-events-none"/, 'style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}');

// 4. Update the social buttons to match your professional Paper/Ink/Maroon theme
code = code.replace(/bg-emerald-600/g, 'bg-maroon');
code = code.replace(/hover:bg-emerald-700/g, 'hover:bg-[#6b1e13]');
code = code.replace(/text-emerald-700/g, 'text-ink');
code = code.replace(/hover:bg-emerald-50/g, 'hover:bg-ink/5');

fs.writeFileSync(file, code);
console.log('ShareCard UI fixed: Duplicate bars hidden, colors corrected, redundant header removed.');
