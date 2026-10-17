import { Request, Response } from "express";
import { ExpenseQueryInput } from "@erp/shared";
import { ExpenseService, expenseService } from "./expense.service";

export class ExpenseController {
  constructor(private readonly service: ExpenseService = expenseService) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as ExpenseQueryInput;
    const result = await this.service.getExpenses(query);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const expense = await this.service.getExpenseById(id);
    res.status(200).json({
      success: true,
      data: expense,
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const expense = await this.service.createExpense(req.body);
    res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      data: expense,
    });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const expense = await this.service.updateExpense(id, req.body);
    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteExpense(id);
    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  };

  getCategories = async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.service.getCategories();
    res.status(200).json({
      success: true,
      data: categories,
    });
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summary = await this.service.getCategorySummary({ startDate, endDate });
    res.status(200).json({
      success: true,
      data: summary,
    });
  };
}

export const expenseController = new ExpenseController();
