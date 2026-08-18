const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the old absolute "Copy link" popup
code = code.replace(/\{showShareMenu && \([\s\S]*?Copy link<\/button>\s*<\/div>\s*\)\}/, '');

// 2. Inject the ShareCardGenerator directly below the closing div of the question
const questionBlockRegex = /(\{poll\.question\}<\/h3>\s*<\/Link>\s*<\/div>)/;

const shareCardInjection = `$1
      {showShareMenu && (
        <div className="px-5 pb-4 animate-in fade-in duration-300">
          <ShareCardGenerator
            title={poll.question}
            voteCount={animatedVotes}
            resultData={results.map((r) => ({ label: r.option, value: r.percentage || 0 }))}
            shareUrl={\`\${typeof window !== 'undefined' ? window.location.origin : ''}/poll/\${poll.id}\`}
          />
        </div>
      )}`;

if (!code.includes('<ShareCardGenerator')) {
    code = code.replace(questionBlockRegex, shareCardInjection);
    fs.writeFileSync(file, code);
    console.log('ShareCardGenerator successfully injected!');
} else {
    console.log('ShareCardGenerator is already present. No changes made.');
}
