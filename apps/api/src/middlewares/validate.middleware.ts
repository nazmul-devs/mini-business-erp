import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

type RequestTarget = "body" | "query" | "params";

export function validate(schema: AnyZodObject, target: RequestTarget = "body") {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req[target] = await schema.parseAsync(req[target]);
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
