import { Router } from "express";
import { createProductSchema, productQuerySchema, stockAdjustmentSchema, updateProductSchema } from "@erp/shared";
import { authenticate, validate } from "../../middlewares";
import { productController } from "./product.controller";

const router = Router();

router.use(authenticate);

router.get("/", validate(productQuerySchema, "query"), productController.getAll);
router.get("/:id", productController.getById);
router.post("/", validate(createProductSchema, "body"), productController.create);
router.put("/:id", validate(updateProductSchema, "body"), productController.update);
router.delete("/:id", productController.delete);

router.get("/:id/movements", productController.getMovements);
router.post("/:id/adjust-stock", validate(stockAdjustmentSchema, "body"), productController.adjustStock);

export const productRouter = router;
