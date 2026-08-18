const fs = require('fs');
const file = 'apps/web/src/components/feed/EnhancedPollCard.tsx';
let code = fs.readFileSync(file, 'utf8');

// --- 1. HYDRATION FIX: Prevent Double Voting Globally ---
const useEffectTarget = /useEffect\(\(\) => \{\s*setHasVoted\(Boolean\(poll\.has_voted\)\);[\s\S]*?\}, \[poll\]\);/;
const newUseEffect = `useEffect(() => {
    let initialHasVoted = Boolean(poll.has_voted);
    let initialVoteIndex = poll.user_vote_index ?? null;
    
    // Instantly sync with browser memory to prevent state desync and double-voting
    if (typeof window !== "undefined") {
      const localVote = window.localStorage.getItem('voted_' + poll.id);
      if (localVote !== null) {
        initialHasVoted = true;
        initialVoteIndex = Number(localVote);
      }
    }
    
    setHasVoted(initialHasVoted);
    setHasOpinion(Boolean(poll.has_opinion));
    setResults(poll.results || []);
    setUserVoteIndex(initialVoteIndex);
    setTotalVotes(poll.total_votes || 0);
    setTotalOpinions(poll.total_opinions || 0);
    setAnimatedVotes(poll.total_votes || 0);
    setAnimatedOpinions(poll.total_opinions || 0);
  }, [poll]);`;
code = code.replace(useEffectTarget, newUseEffect);

// Ensure the local storage is updated the exact millisecond a vote is cast
const handleVoteTarget = /setUserVoteIndex\(index\);\s*setHasVoted\(true\);/;
const newHandleVote = `setUserVoteIndex(index);
    setHasVoted(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem('voted_' + poll.id, index.toString());
    }`;
code = code.replace(handleVoteTarget, newHandleVote);


// --- 2. TACTILE UI FIX: Professional, High-Converting Voting Buttons ---
const votingBlockTarget = /<div className="mt-2 flex w-full flex-col gap-2\.5">[\s\S]*?<\/div>\s*<\/div>\s*\)\s*:\s*\(/;
const newVotingBlock = `<div className="mt-3 flex w-full flex-col gap-3">
            {poll.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => void handleVote(idx)}
                disabled={isVoting}
                className={\`group relative flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ease-out active:scale-[0.98] \${
                  selectedOptionIndex === idx || userVoteIndex === idx
                    ? 'border-maroon bg-maroon/5 text-maroon shadow-sm ring-1 ring-maroon/20'
                    : 'border-paper-border/80 bg-[#fdfbf7] text-[#1f1b18] hover:border-maroon/40 hover:bg-maroon/5 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                }\`}
              >
                <span className={\`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 \${selectedOptionIndex === idx || userVoteIndex === idx ? 'border-maroon' : 'border-ink/20 group-hover:border-maroon/50'}\`}>
                  <span className={\`inline-block h-2.5 w-2.5 rounded-full transition-transform duration-300 \${selectedOptionIndex === idx || userVoteIndex === idx ? 'bg-maroon scale-100' : 'bg-transparent scale-0'}\`} />
                </span>
                <span className="truncate flex-1">{option}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (`;
code = code.replace(votingBlockTarget, newVotingBlock);


// --- 3. BRANDING FIX: Remove Rainbow Result Bars ---
const resultsBlockTarget = /const barColor = STRAWPOLL_COLORS\[idx % STRAWPOLL_COLORS\.length\];/g;
const newResultsBlock = `const barColor = isUserChoice ? 'bg-maroon' : 'bg-[#10b981]';`; // Maroon for user choice, Emerald for everything else
code = code.replace(resultsBlockTarget, newResultsBlock);

fs.writeFileSync(file, code);
console.log('Enterprise UX and State Hydration fixes applied successfully.');
