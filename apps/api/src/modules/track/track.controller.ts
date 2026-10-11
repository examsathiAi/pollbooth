import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";

const router = Router();

const SAFE = /^[a-z0-9_-]{1,30}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Schema = z.object({
  kind: z.enum(["VISIT", "VOTE", "SIGNIN", "IMPRESSION"]),
  src: z.string().regex(SAFE).optional(),
  card: z.string().regex(SAFE).optional(),
  poll_ref: z.string().max(120).optional(),
});

// The Indian calendar day, stored as a plain date
function istDay(): Date {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return new Date(d + "T00:00:00.000Z");
}

// Anonymous counters only: no user, no IP, no device is stored.
router.post("/", async (req, res) => {
  try {
    const input = Schema.parse(req.body);
    let pollKey = "";
    if (input.poll_ref) {
      const poll = UUID.test(input.poll_ref)
        ? await prisma.poll.findUnique({ where: { id: input.poll_ref }, select: { id: true } })
        : await prisma.poll.findFirst({ where: { slug: input.poll_ref }, select: { id: true } });
      if (poll) pollKey = poll.id;
    }
    const key = { day: istDay(), poll_key: pollKey, kind: input.kind, src: input.src || "direct", card: input.card || "" };
    await prisma.trafficDaily.upsert({
      where: { day_poll_key_kind_src_card: key },
      create: { ...key, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (e) {
    // counting must never break the page
  }
  res.status(204).end();
});

export { router as trackRouter };
