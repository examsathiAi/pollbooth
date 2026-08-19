const fs = require('fs');
const file = 'apps/api/src/modules/ai/ai.service.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Auto-unwrap if Gemini wraps the entire JSON object in an array
if (!code.includes('if (Array.isArray(parsed))')) {
  code = code.replace(
    /parsed = JSON\.parse\(cleanJson\);/,
    `parsed = JSON.parse(cleanJson);\n    if (Array.isArray(parsed) && parsed.length > 0) {\n      parsed = parsed[0];\n    }`
  );
}

// 2. Expose the exact JSON path in the error message so we never guess which field broke
code = code.replace(
  /result\.error\.issues\.map\(\(issue\) => issue\.message\)/g,
  'result.error.issues.map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "root"}: ${issue.message}`)'
);

fs.writeFileSync(file, code);
console.log("✅ API patched: Root arrays auto-unwrapped, and Zod errors upgraded with precise field paths.");
