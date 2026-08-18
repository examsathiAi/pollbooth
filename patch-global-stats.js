const fs = require('fs');

// Patch 1: Feed Service (Sidebar Stats)
const feedFile = 'apps/api/src/modules/feed/feed.service.ts';
let feedCode = fs.readFileSync(feedFile, 'utf8');
feedCode = feedCode.replace(
  /const \[totalUsers, totalPolls, totalVotes, votesLastHour\] = await Promise\.all\(\[\s*prisma\.user\.count\(\),\s*prisma\.poll\.count\(\),\s*prisma\.vote\.count\(\),\s*prisma\.vote\.count\(\{\s*where: \{ voted_at: \{ gte: new Date\(Date\.now\(\) - 60 \* 60 \* 1000\) \} \},\s*\}\),\s*\]\);/,
  `const [totalUsers, totalPolls, regVotes, guestVotes, regVotesLastHour, guestVotesLastHour] = await Promise.all([
        prisma.user.count(),
        prisma.poll.count(),
        prisma.vote.count(),
        prisma.guestVote.count(),
        prisma.vote.count({ where: { voted_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } } }),
        prisma.guestVote.count({ where: { voted_at: { gte: new Date(Date.now() - 60 * 60 * 1000) } } })
      ]);
      const totalVotes = regVotes + guestVotes;
      const votesLastHour = regVotesLastHour + guestVotesLastHour;`
);
fs.writeFileSync(feedFile, feedCode);

// Patch 2: Admin Service (Dashboard Stats)
const adminFile = 'apps/api/src/modules/admin/admin.service.ts';
let adminCode = fs.readFileSync(adminFile, 'utf8');
adminCode = adminCode.replace(
  /const \[\s*totalUsers,\s*activeUsersToday,\s*totalVotes,\s*totalOpinions,\s*pendingModeration,\s*totalPolls,\s*activePolls,?\s*\] = await Promise\.all\(\[\s*prisma\.user\.count\(\),\s*prisma\.user\.count\(\{\s*where: \{ last_active_at: \{ gte: new Date\(Date\.now\(\) - 24 \* 60 \* 60 \* 1000\) \} \},\s*\}\),\s*prisma\.vote\.count\(\),\s*prisma\.opinion\.count\(\),\s*prisma\.opinion\.count\(\{\s*where: \{ is_hidden: true, moderation_status: "FLAGGED" \}\s*\}\),\s*prisma\.poll\.count\(\),\s*prisma\.poll\.count\(\{\s*where: \{ is_active: true, status: "ACTIVE" \}\s*\}\),\s*\]\);/,
  `const [
        totalUsers,
        activeUsersToday,
        regVotes,
        guestVotes,
        totalOpinions,
        pendingModeration,
        totalPolls,
        activePolls,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { last_active_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        prisma.vote.count(),
        prisma.guestVote.count(),
        prisma.opinion.count(),
        prisma.opinion.count({ where: { is_hidden: true, moderation_status: "FLAGGED" } }),
        prisma.poll.count(),
        prisma.poll.count({ where: { is_active: true, status: "ACTIVE" } }),
      ]);
      const totalVotes = regVotes + guestVotes;`
);
fs.writeFileSync(adminFile, adminCode);

console.log('Global Stats Patched Successfully.');
