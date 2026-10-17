import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

type RequestTarget = "body" | "query" | "params";

export function validate(schema: AnyZodObject, target: RequestTarget = "body") {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      Object.defineProperty(req, target, {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
}
