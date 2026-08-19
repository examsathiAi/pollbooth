const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Rewrite the summary directive to demand a massive investigative article
const oldSummary = /1\. Write 'ai_summary': A comprehensive 2-3 paragraph investigative news brief[\s\S]*?Always verify facts independently\.\*/;
const newSummary = `1. Write 'ai_summary': A massive, deep-dive investigative journalism article (6-8 dense paragraphs, minimum 800 words). It must read like a premium front-page editorial. Cover extensive background history, micro and macro implications, key stakeholders, public sentiment, and detailed analysis based strictly on the verified \${currentYear} material. MUST end with:\\n\\n*Disclaimer: This context was AI-generated based on recent news sources. Always verify facts independently.*`;

code = code.replace(oldSummary, newSummary);

// 2. Double the output token limit so the AI is physically allowed to generate 800+ words
code = code.replace(/maxOutputTokens:\s*2500,/, 'maxOutputTokens: 6000,');

fs.writeFileSync(file, code);
console.log("✅ AI Prompt upgraded: Enforcing massive 6-8 paragraph investigative articles.");
