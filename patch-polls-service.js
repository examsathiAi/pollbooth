const fs = require('fs');
const file = 'apps/api/src/modules/polls/polls.service.ts';
let code = fs.readFileSync(file, 'utf8');

// Patch 1: Merge tables in getPollById
code = code.replace(
  /const voteDistribution = await prisma\.vote\.groupBy\([\s\S]*?const results = this\.computePollResults\(poll\.options, voteDistribution, totalVotes\);/,
  `const [voteDistribution, guestVoteDistribution, guestCount] = await Promise.all([
      prisma.vote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
      prisma.guestVote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
      prisma.guestVote.count({ where: { poll_id: pollId } })
    ]);

    const combinedDistribution = [...voteDistribution];
    guestVoteDistribution.forEach(gv => {
      const existing = combinedDistribution.find(v => v.option_index === gv.option_index);
      if (existing) {
        existing._count.option_index += gv._count.option_index;
      } else {
        combinedDistribution.push({ option_index: gv.option_index, _count: { option_index: gv._count.option_index } });
      }
    });

    const totalVotes = poll._count.votes + guestCount;
    const results = this.computePollResults(poll.options, combinedDistribution, totalVotes);`
);

// Patch 2: Merge tables in getPolls (The Main Feed)
code = code.replace(
  /const voteDistribution = await prisma\.vote\.groupBy\([\s\S]*?new Map<string, Array<typeof voteDistribution\[number\]>>\(\)\);/,
  `const [voteDistribution, guestVoteDistribution] = await Promise.all([
      prisma.vote.groupBy({ by: ["poll_id", "option_index"], where: { poll_id: { in: pollIds } }, _count: { option_index: true } }),
      prisma.guestVote.groupBy({ by: ["poll_id", "option_index"], where: { poll_id: { in: pollIds } }, _count: { option_index: true } })
    ]);

    const voteDistributionByPoll = new Map();
    const guestCountMap = new Map();

    voteDistribution.forEach(vote => {
      const existing = voteDistributionByPoll.get(vote.poll_id) || [];
      existing.push({ option_index: vote.option_index, _count: { option_index: vote._count.option_index } });
      voteDistributionByPoll.set(vote.poll_id, existing);
    });

    guestVoteDistribution.forEach(gVote => {
      const existing = voteDistributionByPoll.get(gVote.poll_id) || [];
      const match = existing.find(v => v.option_index === gVote.option_index);
      if (match) {
        match._count.option_index += gVote._count.option_index;
      } else {
        existing.push({ option_index: gVote.option_index, _count: { option_index: gVote._count.option_index } });
      }
      voteDistributionByPoll.set(gVote.poll_id, existing);

      // Mathematically tally the guest votes per poll for the final output
      guestCountMap.set(gVote.poll_id, (guestCountMap.get(gVote.poll_id) || 0) + gVote._count.option_index);
    });`
);

// Patch 3: Apply the merged math to the final Next.js map output
code = code.replace(
  /const totalVotes = poll\._count\.votes;\s*const results = this\.computePollResults\(poll\.options, voteDistributionByPoll\.get\(poll\.id\) \|\| \[\], totalVotes\);/,
  `const totalVotes = poll._count.votes + (guestCountMap.get(poll.id) || 0);\n        const results = this.computePollResults(poll.options, voteDistributionByPoll.get(poll.id) || [], totalVotes);`
);

fs.writeFileSync(file, code);
console.log('Polls Service Patch applied successfully.');
