import {
  CreateExpenseInput,
  ExpenseCategorySummary,
  ExpenseItem,
  ExpenseQueryInput,
  PaginatedResult,
  UpdateExpenseInput,
} from "@erp/shared";
import { Expense } from "@erp/database";
import { AppError } from "../../shared/errors";
import { ExpenseRepository, expenseRepository } from "./expense.repository";

export class ExpenseService {
  constructor(private readonly repo: ExpenseRepository = expenseRepository) {}

  private mapToItem(expense: Expense): ExpenseItem {
    return {
      id: expense.id,
      title: expense.title,
      category: expense.category,
      amount: Number(expense.amount),
      date: expense.date,
      description: expense.description,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  async getExpenses(query: ExpenseQueryInput): Promise<PaginatedResult<ExpenseItem>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.repo.findMany({
      ...query,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((e) => this.mapToItem(e)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getExpenseById(id: string): Promise<ExpenseItem> {
    const expense = await this.repo.findById(id);
    if (!expense) {
      throw AppError.notFound("Expense not found");
    }

    return this.mapToItem(expense);
  }

  async createExpense(data: CreateExpenseInput): Promise<ExpenseItem> {
    const created = await this.repo.create(data);
    return this.mapToItem(created);
  }

  async updateExpense(id: string, data: UpdateExpenseInput): Promise<ExpenseItem> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Expense not found");
    }

    const updated = await this.repo.update(id, data);
    return this.mapToItem(updated);
  }

  async deleteExpense(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Expense not found");
    }

    await this.repo.delete(id);
  }

  async getCategories(): Promise<string[]> {
    return this.repo.getCategories();
  }

  async getCategorySummary(query: {
    startDate?: string;
    endDate?: string;
  }): Promise<ExpenseCategorySummary[]> {
    return this.repo.getCategorySummary(query);
  }
}

export const expenseService = new ExpenseService();
