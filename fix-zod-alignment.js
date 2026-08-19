const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

// Surgically target ONLY the JSON definition inside the prompt to perfectly match ai.types.ts
const targetBlock = /Return strictly valid JSON matching:[\s\S]*?\}/;

const correctedBlock = `Return strictly valid JSON containing ALL of these exact keys:
{
  "improved_question": string,
  "seo_title": string,
  "meta_description": string,
  "slug": string,
  "keywords": string[],
  "hashtags": string[],
  "facebook_caption": string,
  "instagram_caption": string,
  "x_caption": string,
  "whatsapp_share_text": string,
  "ai_summary": string,
  "faq": [{"question": string, "answer": string}],
  "og_title": string,
  "og_description": string,
  "suggested_topics": string[],
  "suggested_options": string[],
  "sources": [{"url": string, "title": string, "publisher": string, "published_at": string}]
}`;

code = code.replace(targetBlock, correctedBlock);

fs.writeFileSync(file, code);
console.log('Prompt successfully aligned with GeminiPollContentWithSourcesSchema.');
