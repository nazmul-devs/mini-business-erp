import { Router } from "express";
import {
  createSaleSchema,
  saleQuerySchema,
  updateSaleSchema,
} from "@erp/shared";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { saleController } from "./sale.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(saleQuerySchema, "query"),
  saleController.getAll
);

router.get("/:id", authenticate, saleController.getById);

router.post(
  "/",
  authenticate,
  validate(createSaleSchema),
  saleController.create
);

router.put(
  "/:id",
  authenticate,
  validate(updateSaleSchema),
  saleController.update
);

router.delete("/:id", authenticate, saleController.delete);

export { router as saleRouter };
