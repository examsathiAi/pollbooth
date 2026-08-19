const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

if (code.includes('parsed.faq.map(item =>')) {
  code = code.replace(/parsed\.faq\.map\(item =>/g, 'parsed.faq.map((item: any) =>');
  fs.writeFileSync(file, code);
  console.log("✅ TypeScript strict mode satisfied: Explicitly typed 'item' as 'any'.");
} else {
  console.log("⚠️ Target line not found. Please verify the file contents.");
}
