import { Request, Response } from "express";
import { AuthService, authService } from "./auth.service";

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.login(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  };
}

export const authController = new AuthController();
