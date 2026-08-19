const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

const targetLogic = `      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }`;

const healingLogic = `      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }
      
      // SELF-HEALING: If Gemini hallucinates the FAQ as an array of arrays instead of objects
      if (parsed && Array.isArray(parsed.faq)) {
        parsed.faq = parsed.faq.map(item => {
          if (Array.isArray(item) && item.length >= 2) {
            return { question: String(item[0]), answer: String(item[1]) };
          }
          return item;
        });
      }`;

if (code.includes(targetLogic) && !code.includes('SELF-HEALING: If Gemini hallucinates')) {
  code = code.replace(targetLogic, healingLogic);
  fs.writeFileSync(file, code);
  console.log("✅ FAQ Self-Healing Pre-processor injected successfully.");
} else {
  console.log("⚠️ Target logic not found or already patched.");
}
