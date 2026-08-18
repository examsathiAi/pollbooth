const fs = require('fs');
const file = 'apps/api/src/modules/votes/votes.service.ts';
let code = fs.readFileSync(file, 'utf8');

const newGuestVote = `async guestVote(pollId: string, input: GuestVoteInput, ip?: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: { is_active: true, status: true, options: true, question: true },
    });

    if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
      throw new Error("Poll is not active");
    }

    if (input.option_index >= poll.options.length) {
      throw new Error("Invalid option index");
    }

    const ipHash = ip ? require("crypto").createHash("sha256").update(ip).digest("hex") : null;

    const guestVote = await prisma.guestVote.create({
      data: {
        session_id: input.session_id,
        poll_id: pollId,
        option_index: input.option_index,
        ip_hash: ipHash,
      },
    });

    // 1. Bust the immediate poll cache
    await redis.del(\`poll_cache:\${pollId}\`);
    // 2. Safely bust global feed caches so the REST API recalculates
    redis.keys('*feed*').then(keys => keys.length && redis.del(keys)).catch(() => {});

    // 3. Fire WebSocket broadcast to update UI instantly
    Promise.resolve().then(async () => {
      try {
        const [voteCount, guestCount] = await Promise.all([
          prisma.vote.count({ where: { poll_id: pollId } }),
          prisma.guestVote.count({ where: { poll_id: pollId } })
        ]);
        const pollVoteCount = voteCount + guestCount;

        if (io) {
          const [voteCounts, guestCounts] = await Promise.all([
            prisma.vote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } }),
            prisma.guestVote.groupBy({ by: ["option_index"], where: { poll_id: pollId }, _count: { option_index: true } })
          ]);

          const totalOpinions = await prisma.opinion.count({ where: { poll_id: pollId } });
          const optionsArray = Array.isArray(poll.options) ? poll.options : [];

          const results = optionsArray.map((optionText: any, index: number) => {
            const vc = voteCounts.find((v) => v.option_index === index)?._count.option_index || 0;
            const gc = guestCounts.find((v) => v.option_index === index)?._count.option_index || 0;
            const count = vc + gc;
            const percentage = pollVoteCount > 0 ? Math.round((count / pollVoteCount) * 100) : 0;
            return { option: String(optionText), index, count, percentage };
          });

          io.to(\`poll_\${pollId}\`).emit("poll_updated", {
            pollId,
            totalVotes: pollVoteCount,
            results,
            totalOpinions,
            velocity: 15,
            isLive: true,
          });
        }
      } catch (e) {
        logger.error("Guest socket failed", e);
      }
    });

    return guestVote;
  }`;

// Surgically replace only the guestVote function
code = code.replace(/async guestVote\([\s\S]*?return guestVote;\n\s*}/, newGuestVote);
fs.writeFileSync(file, code);
console.log('Patch applied successfully.');
