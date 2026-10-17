import { Router } from "express";
import { createPartySchema, partyQuerySchema, updatePartySchema } from "@erp/shared";
import { authenticate, validate } from "../../middlewares";
import { partyController } from "./party.controller";

const router = Router();

router.use(authenticate);

router.get("/", validate(partyQuerySchema, "query"), partyController.getAll);
router.get("/:id", partyController.getById);
router.post("/", validate(createPartySchema, "body"), partyController.create);
router.put("/:id", validate(updatePartySchema, "body"), partyController.update);
router.delete("/:id", partyController.delete);

export const partyRouter = router;
