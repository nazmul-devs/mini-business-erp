import { Router } from "express";
import {
  createPurchaseSchema,
  purchaseQuerySchema,
  updatePurchaseSchema,
} from "@erp/shared";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { purchaseController } from "./purchase.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(purchaseQuerySchema, "query"),
  purchaseController.getAll
);

router.get("/:id", authenticate, purchaseController.getById);

router.post(
  "/",
  authenticate,
  validate(createPurchaseSchema),
  purchaseController.create
);

router.put(
  "/:id",
  authenticate,
  validate(updatePurchaseSchema),
  purchaseController.update
);

router.delete("/:id", authenticate, purchaseController.delete);

export { router as purchaseRouter };
