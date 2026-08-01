import { Router } from "express";
import { authGuard } from "../../common/guards/auth.guard";
import { paymentsService } from "./payments.service";

const router = Router();

router.get("/earnings", authGuard, async (req, res, next) => {
  try {
    const result = await paymentsService.getEarnings(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/withdraw", authGuard, async (req, res, next) => {
  try {
    const { amount, upi_id } = req.body;
    const result = await paymentsService.requestWithdrawal(req.user!.id, amount, upi_id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/subscription", authGuard, async (req, res, next) => {
  try {
    const result = await paymentsService.getSubscription(req.user!.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as paymentRouter };
