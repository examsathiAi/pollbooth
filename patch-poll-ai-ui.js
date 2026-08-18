const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// Inject the AI FAQ array directly above the closing main tag
const target = /<\/main>/;

const faqUI = `        {poll.faq && Array.isArray(poll.faq) && poll.faq.length > 0 ? (
          <div className="mx-4 my-8 animate-in fade-in duration-500">
            <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-maroon" />
              Topic Deep Dive
            </h3>
            <div className="space-y-3">
              {poll.faq.map((item: any, idx: number) => (
                <div key={idx} className="rounded-2xl border border-paper-border/80 bg-[#fdfbf7] p-4.5 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <h4 className="font-bold text-[#1f1b18] text-sm mb-2 leading-snug">{item.question || item.q}</h4>
                  <p className="text-sm text-[#6b665c] leading-relaxed">{item.answer || item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>`;

if (!code.includes('Topic Deep Dive')) {
    code = code.replace(target, faqUI);
    fs.writeFileSync(file, code);
    console.log('AI FAQ Deep Dive UI successfully injected.');
} else {
    console.log('FAQ UI is already present. No changes made.');
}
