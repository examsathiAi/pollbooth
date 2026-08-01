import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { validateBody } from "../../common/pipes/validation.pipe";
import { civicService } from "./civic.service";
import { CreateCivicIssueSchema } from "./civic.types";

const router = Router();

router.post("/issues", authGuard, validateBody(CreateCivicIssueSchema), async (req, res, next) => {
  try {
    const result = await civicService.createIssue(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/issues", async (req, res, next) => {
  try {
    const result = await civicService.getIssues(
      req.query.city as string,
      req.query.state as string,
      req.query.status as string,
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as civicRouter };
