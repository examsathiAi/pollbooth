const fs = require('fs');
const file = 'apps/web/src/components/poll/PollDetailClient.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the redundant manual header since the global platform layout will now handle navigation
code = code.replace(/<header className="sticky top-0[\s\S]*?<\/header>/, '');

// 2. Remove the 'max-w-lg mx-auto' constraint so it perfectly fills the feed's center column
code = code.replace(/<div className="max-w-lg mx-auto min-h-screen bg-transparent transition-colors duration-300">/, '<div className="w-full bg-transparent transition-colors duration-300 pb-12">');

fs.writeFileSync(file, code);
console.log('Poll Detail layout perfectly synced with main platform.');
