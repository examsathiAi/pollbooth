const fs = require('fs');
const file = 'apps/web/src/app/poll/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Strip out any broken manual image declarations so Next.js uses opengraph-image.tsx natively
code = code.replace(/images:\s*\[[\s\S]*?\],/g, '');

fs.writeFileSync(file, code);
console.log('Page metadata cleaned. Next.js App Router will now natively handle the OG images.');
