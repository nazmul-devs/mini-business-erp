import { Router } from "express";
import { loginSchema, registerSchema } from "@erp/shared";
import { authenticate, validate } from "../../middlewares";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMe);
router.post("/logout", authenticate, authController.logout);

export const authRouter = router;
