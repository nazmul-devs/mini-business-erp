import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExpenseService } from "./expense.service";
import { ExpenseRepository } from "./expense.repository";
import { AppError } from "../../shared/errors";

describe("ExpenseService", () => {
  let expenseService: ExpenseService;
  let mockRepo: ExpenseRepository;

  const mockExpense = {
    id: "exp-1",
    title: "Office Internet Bill",
    category: "Utilities",
    amount: 2500,
    date: new Date("2026-10-15"),
    description: "Monthly fiber internet broadband payment",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getCategories: vi.fn(),
      getCategorySummary: vi.fn(),
    } as unknown as ExpenseRepository;

    expenseService = new ExpenseService(mockRepo);
  });

  describe("getExpenses", () => {
    it("should return paginated list of expenses with totalPages", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [mockExpense as any],
        total: 1,
      });

      const result = await expenseService.getExpenses({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("exp-1");
      expect(result.items[0].amount).toBe(2500);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getExpenseById", () => {
    it("should return expense when found", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockExpense as any);

      const result = await expenseService.getExpenseById("exp-1");
      expect(result.id).toBe("exp-1");
      expect(result.title).toBe("Office Internet Bill");
      expect(result.category).toBe("Utilities");
    });

    it("should throw not found error if expense does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(expenseService.getExpenseById("missing-id")).rejects.toThrow(
        AppError.notFound("Expense not found")
      );
    });
  });

  describe("createExpense", () => {
    it("should create and return mapped expense item", async () => {
      vi.mocked(mockRepo.create).mockResolvedValue(mockExpense as any);

      const result = await expenseService.createExpense({
        title: "Office Internet Bill",
        category: "Utilities",
        amount: 2500,
        description: "Monthly fiber internet broadband payment",
      });

      expect(result.title).toBe("Office Internet Bill");
      expect(result.amount).toBe(2500);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Office Internet Bill",
          amount: 2500,
        })
      );
    });
  });

  describe("updateExpense", () => {
    it("should throw not found if expense does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        expenseService.updateExpense("missing-id", { amount: 3000 })
      ).rejects.toThrow(AppError.notFound("Expense not found"));
    });

    it("should update and return modified expense", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockExpense as any);
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...mockExpense,
        amount: 2800,
      } as any);

      const result = await expenseService.updateExpense("exp-1", { amount: 2800 });
      expect(result.amount).toBe(2800);
      expect(mockRepo.update).toHaveBeenCalledWith("exp-1", { amount: 2800 });
    });
  });

  describe("deleteExpense", () => {
    it("should throw not found if expense does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(expenseService.deleteExpense("missing-id")).rejects.toThrow(
        AppError.notFound("Expense not found")
      );
    });

    it("should delete expense when exists", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockExpense as any);
      vi.mocked(mockRepo.delete).mockResolvedValue(mockExpense as any);

      await expenseService.deleteExpense("exp-1");
      expect(mockRepo.delete).toHaveBeenCalledWith("exp-1");
    });
  });

  describe("getCategories", () => {
    it("should return distinct categories list", async () => {
      vi.mocked(mockRepo.getCategories).mockResolvedValue([
        "Office Supplies",
        "Rent",
        "Utilities",
      ]);

      const categories = await expenseService.getCategories();
      expect(categories).toEqual(["Office Supplies", "Rent", "Utilities"]);
    });
  });

  describe("getCategorySummary", () => {
    it("should return aggregated category totals and counts", async () => {
      vi.mocked(mockRepo.getCategorySummary).mockResolvedValue([
        { category: "Rent", totalAmount: 50000, count: 1 },
        { category: "Utilities", totalAmount: 7500, count: 3 },
      ]);

      const summary = await expenseService.getCategorySummary({});
      expect(summary).toHaveLength(2);
      expect(summary[0].category).toBe("Rent");
      expect(summary[0].totalAmount).toBe(50000);
      expect(summary[1].count).toBe(3);
    });
  });
});
