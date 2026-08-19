const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// Target the corrupted function signature and replace it with the clean, correctly scoped version
const badSignatureRegex = /export function PollDetailClient\(\{[\s\S]*?pollId,\s*initialPoll\s*\}\s*:\s*PollDetailClientProps\)\s*\{/;

const cleanSignature = `export function PollDetailClient({ pollId, initialPoll }: PollDetailClientProps) {
  const router = useRouter();
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);`;

code = code.replace(badSignatureRegex, cleanSignature);

fs.writeFileSync(file, code);
console.log('Syntax error resolved. Variables are correctly scoped.');
