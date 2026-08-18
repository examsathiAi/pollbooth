const fs = require('fs');
const file = 'apps/api/src/modules/polls/polls.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/guestVoteDistribution\.forEach\(gv =>/g, 'guestVoteDistribution.forEach((gv: any) =>');
code = code.replace(/combinedDistribution\.find\(v =>/g, 'combinedDistribution.find((v: any) =>');
code = code.replace(/voteDistribution\.forEach\(vote =>/g, 'voteDistribution.forEach((vote: any) =>');
code = code.replace(/guestVoteDistribution\.forEach\(gVote =>/g, 'guestVoteDistribution.forEach((gVote: any) =>');
code = code.replace(/existing\.find\(v =>/g, 'existing.find((v: any) =>');

fs.writeFileSync(file, code);
console.log('TypeScript strict types patched successfully.');
