import { prisma, Expense, Prisma } from "@erp/database";
import { CreateExpenseInput, ExpenseQueryInput, UpdateExpenseInput } from "@erp/shared";

export class ExpenseRepository {
  async findMany(query: ExpenseQueryInput): Promise<{ items: Expense[]; total: number }> {
    const { search, category, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (category && category.trim()) {
      where.category = { equals: category.trim(), mode: "insensitive" };
    }

    if (startDate || endDate) {
      where.date = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.expense.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<Expense | null> {
    return prisma.expense.findUnique({
      where: { id },
    });
  }

  async create(data: CreateExpenseInput): Promise<Expense> {
    return prisma.expense.create({
      data: {
        title: data.title.trim(),
        category: data.category.trim(),
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description?.trim() || null,
      },
    });
  }

  async update(id: string, data: UpdateExpenseInput): Promise<Expense> {
    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.category !== undefined && { category: data.category.trim() }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
        ...(data.description !== undefined && { description: data.description.trim() || null }),
      },
    });
  }

  async delete(id: string): Promise<Expense> {
    return prisma.expense.delete({
      where: { id },
    });
  }

  async getCategories(): Promise<string[]> {
    const results = await prisma.expense.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return results.map((r) => r.category);
  }

  async getCategorySummary(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{ category: string; totalAmount: number; count: number }>> {
    const where: Prisma.ExpenseWhereInput = {};

    if (options?.startDate || options?.endDate) {
      where.date = {
        ...(options.startDate && { gte: new Date(options.startDate) }),
        ...(options.endDate && { lte: new Date(options.endDate) }),
      };
    }

    const grouped = await prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
      _count: { id: true },
      where,
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
    });

    return grouped.map((g) => ({
      category: g.category,
      totalAmount: Number(g._sum.amount || 0),
      count: g._count.id,
    }));
  }
}

export const expenseRepository = new ExpenseRepository();
