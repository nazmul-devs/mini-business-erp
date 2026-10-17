import { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors";

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
