const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix invalid Tailwind padding class 'p-4.5' which was causing the box to have zero padding
code = code.replace(/p-4\.5/g, 'p-4');

fs.writeFileSync(file, code);
console.log('FAQ padding bug resolved.');
