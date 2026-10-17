import { Router } from "express";
import {
  createExpenseSchema,
  expenseQuerySchema,
  updateExpenseSchema,
} from "@erp/shared";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { expenseController } from "./expense.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  validate(expenseQuerySchema, "query"),
  expenseController.getAll
);

router.get("/categories", authenticate, expenseController.getCategories);

router.get("/summary", authenticate, expenseController.getSummary);

router.get("/:id", authenticate, expenseController.getById);

router.post(
  "/",
  authenticate,
  validate(createExpenseSchema),
  expenseController.create
);

router.put(
  "/:id",
  authenticate,
  validate(updateExpenseSchema),
  expenseController.update
);

router.delete("/:id", authenticate, expenseController.delete);

export { router as expenseRouter };
