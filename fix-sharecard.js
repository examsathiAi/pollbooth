const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the old absolute dropdown containing only "Copy link"
const oldShareBlock = /<div>\s*<button onClick=\{\(\) => setShowShareMenu\(!showShareMenu\)\} className="rounded-full p-1\.5 text-ink-muted hover:bg-ink\/5 hover:text-ink transition-colors duration-200">\s*<Share2 className="h-4 w-4" \/>\s*<\/button>\s*\{showShareMenu && \([\s\S]*?Copy link<\/button>\s*<\/div>\s*\)\}\s*<\/div>/;

const newShareButton = `<div>
          <button onClick={() => setShowShareMenu(!showShareMenu)} className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink transition-colors duration-200">
            <Share2 className="h-4 w-4" />
          </button>
        </div>`;

code = code.replace(oldShareBlock, newShareButton);

// 2. Insert the ShareCardGenerator component container right below the question header when toggled
const headerTarget = /<Link href=\{`\/poll\/\$\{poll\.id\}`\}>\s*<h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight leading-snug text-ink mb-2 line-clamp-4 group-hover:text-maroon transition-colors duration-200">\{poll\.question\}<\/h3>\s*<\/Link>\s*<\/div>/;

const shareCardContainer = `<Link href={\`/poll/\${poll.id}\`} className="block group">
          <h3 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight leading-snug text-ink mb-2 line-clamp-4 group-hover:text-maroon transition-colors duration-200">{poll.question}</h3>
        </Link>
        {showShareMenu && (
          <div className="mt-4">
            <ShareCardGenerator
              title={poll.question}
              voteCount={animatedVotes}
              resultData={results.map((r) => ({ label: r.option, value: r.percentage || 0 }))}
              shareUrl={\`\${typeof window !== 'undefined' ? window.location.origin : ''}/poll/\${poll.id}\`}
            />
          </div>
        )}
      </div>`;

code = code.replace(headerTarget, shareCardContainer);

fs.writeFileSync(file, code);
console.log('ShareCardGenerator integrated successfully.');
