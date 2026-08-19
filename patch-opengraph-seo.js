const fs = require('fs');
const file = 'apps/web/src/app/(platform)/poll/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Ensure hashtags including #pollbooth are integrated into OG description
const ogDescTarget = /const description = \(poll as any\)\.ai_summary\?\.substring\(0, 160\) \|\| poll\.meta_description\?\.trim\(\) \|\| `Vote on this poll and see live results for \$\{poll\.category\}\.`;/;

const newOgLogic = `const baseDesc = (poll as any).ai_summary?.substring(0, 140) || poll.meta_description?.trim() || \`Vote on this poll and see live results for \${poll.category}.\`;
  const allHashtags = (poll.hashtags && poll.hashtags.length > 0) ? poll.hashtags : ["#pollbooth"];
  const formattedTags = allHashtags.map(t => t.startsWith('#') ? t : \`#\${t}\`).join(' ');
  const description = \`\${baseDesc} \${formattedTags}\`;`;

code = code.replace(ogDescTarget, newOgLogic);

fs.writeFileSync(file, code);
console.log('OpenGraph metadata patched to include trending hashtags and #pollbooth');
