import { Router } from "express";
import { z } from "zod";
import { optionalAuthGuard } from "../../common/guards/auth.guard";
import { prisma } from "../../config/database";

const router = Router();

const KINDS = ["COMPLAINT", "ACCESS", "CORRECTION", "CONSENT_WITHDRAWAL", "ERASURE", "CONTENT_REPORT"] as const;

const Schema = z.object({
  kind: z.enum(KINDS),
  name: z.string().trim().min(2).max(100),
  contact: z.string().trim().min(5).max(255),
  message: z.string().trim().min(10).max(3000),
});

function httpError(status: number, message: string) {
  const e: any = new Error(message);
  e.status = status;
  return e;
}

router.post("/", optionalAuthGuard, async (req, res, next) => {
  try {
    const input = Schema.parse(req.body);
    const contact = input.contact.toLowerCase();
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recent = await prisma.grievance.count({ where: { contact, created_at: { gte: since } } });
    if (recent >= 5) throw httpError(429, "You have sent several requests today. We will reply to them soon.");

    const due = new Date(Date.now() + 15 * 24 * 3600 * 1000);
    const row = await prisma.grievance.create({
      data: { kind: input.kind, name: input.name, contact, message: input.message, user_id: (req as any).user?.id || null, due_at: due },
    });
    res.status(201).json({
      reference: "GRV-" + String(row.ticket_no).padStart(5, "0"),
      due_date: due,
      message: "Your request has been recorded. Please keep this reference number.",
    });
  } catch (err) { next(err); }
});

export { router as grievanceRouter };
