import {
  prisma,
  Purchase,
  PurchaseItem,
  DocumentStatus,
  PaymentStatus,
  StockMovementType,
  Prisma,
} from "@erp/database";
import { AppError } from "../../shared/errors";

export interface CreatePurchaseRepoInput {
  purchaseNo: string;
  partyId: string;
  date?: Date;
  status: DocumentStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  notes?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export interface UpdatePurchaseRepoInput {
  partyId?: string;
  date?: Date;
  status?: DocumentStatus;
  paymentStatus?: PaymentStatus;
  subtotal?: number;
  discount?: number;
  total?: number;
  paidAmount?: number;
  notes?: string | null;
  items?: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    lineTotal: number;
  }>;
}

export interface PurchaseQueryOptions {
  search?: string;
  partyId?: string;
  status?: DocumentStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export type PurchaseWithRelations = Purchase & {
  party: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    address?: string | null;
  };
  items: Array<
    PurchaseItem & {
      product: {
        id: string;
        name: string;
        sku: string;
        unit: string;
      };
    }
  >;
  _count?: {
    items: number;
  };
};

export class PurchaseRepository {
  async findMany(query: PurchaseQueryOptions): Promise<{ items: PurchaseWithRelations[]; total: number }> {
    const { search, partyId, status, paymentStatus, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {};

    if (partyId) {
      where.partyId = partyId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
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
        { purchaseNo: { contains: term, mode: "insensitive" } },
        { party: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          party: {
            select: {
              id: true,
              name: true,
              type: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.purchase.count({ where }),
    ]);

    return { items: items as unknown as PurchaseWithRelations[], total };
  }

  async findById(id: string): Promise<PurchaseWithRelations | null> {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            id: true,
            name: true,
            type: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    return purchase as unknown as PurchaseWithRelations | null;
  }

  async findByPurchaseNo(purchaseNo: string): Promise<Purchase | null> {
    return prisma.purchase.findUnique({
      where: { purchaseNo },
    });
  }

  async generatePurchaseNo(): Promise<string> {
    const profile = await prisma.businessProfile.findFirst();
    const prefix = profile?.purchasePrefix || "PUR";

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const countToday = await prisma.purchase.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const sequence = String(countToday + 1).padStart(4, "0");
    const candidate = `${prefix}-${dateStr}-${sequence}`;

    const exists = await this.findByPurchaseNo(candidate);
    if (!exists) {
      return candidate;
    }

    return `${prefix}-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  async create(data: CreatePurchaseRepoInput): Promise<PurchaseWithRelations> {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          purchaseNo: data.purchaseNo,
          partyId: data.partyId,
          date: data.date || new Date(),
          status: data.status,
          paymentStatus: data.paymentStatus,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          paidAmount: data.paidAmount,
          notes: data.notes || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          party: {
            select: {
              id: true,
              name: true,
              type: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
      });

      if (data.status === DocumentStatus.COMPLETED) {
        for (const item of data.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: item.quantity },
              purchasePrice: item.unitCost,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.PURCHASE_IN,
              quantity: item.quantity,
              referenceType: "PURCHASE",
              referenceId: purchase.id,
              note: `Purchase order #${purchase.purchaseNo} received`,
            },
          });
        }
      }

      return purchase as unknown as PurchaseWithRelations;
    });
  }

  async update(id: string, data: UpdatePurchaseRepoInput): Promise<PurchaseWithRelations> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existing) {
        throw AppError.notFound("Purchase not found");
      }

      const prevStatus = existing.status;
      const nextStatus = data.status || prevStatus;

      // Case 1: Status changing from COMPLETED to CANCELLED -> Revert stock
      if (prevStatus === DocumentStatus.COMPLETED && nextStatus === DocumentStatus.CANCELLED) {
        for (const item of existing.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw AppError.notFound(`Product ID ${item.productId} not found`);
          }

          const currentStock = Number(product.currentStock);
          const deductQty = Number(item.quantity);

          if (currentStock < deductQty) {
            throw AppError.badRequest(
              `Cannot cancel purchase. Product "${product.name}" has stock ${currentStock} ${product.unit}, but reverting requires reducing ${deductQty} ${product.unit}.`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: deductQty },
            },
          });

          await tx.stockMovement.deleteMany({
            where: {
              productId: item.productId,
              referenceType: "PURCHASE",
              referenceId: existing.id,
            },
          });
        }
      }

      // Case 2: Status changing from DRAFT to COMPLETED -> Increase stock & write movements
      if (prevStatus === DocumentStatus.DRAFT && nextStatus === DocumentStatus.COMPLETED) {
        if (data.items && data.items.length > 0) {
          await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
          await tx.purchaseItem.createMany({
            data: data.items.map((item) => ({
              purchaseId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              lineTotal: item.lineTotal,
            })),
          });
        }

        const itemsToProcess = data.items || existing.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          lineTotal: Number(i.lineTotal),
        }));

        for (const item of itemsToProcess) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: item.quantity },
              purchasePrice: item.unitCost,
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.PURCHASE_IN,
              quantity: item.quantity,
              referenceType: "PURCHASE",
              referenceId: existing.id,
              note: `Purchase order #${existing.purchaseNo} received`,
            },
          });
        }
      }

      // Case 3: Already COMPLETED staying COMPLETED -> Cannot modify items (prevent stock desync)
      if (prevStatus === DocumentStatus.COMPLETED && nextStatus === DocumentStatus.COMPLETED) {
        if (data.items && data.items.length > 0) {
          throw AppError.badRequest("Cannot modify items of a completed purchase. Cancel it first to adjust inventory.");
        }
      }

      // Case 4: DRAFT staying DRAFT -> Update items if provided
      if (prevStatus === DocumentStatus.DRAFT && nextStatus === DocumentStatus.DRAFT && data.items) {
        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseItem.createMany({
          data: data.items.map((item) => ({
            purchaseId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            lineTotal: item.lineTotal,
          })),
        });
      }

      const updated = await tx.purchase.update({
        where: { id },
        data: {
          ...(data.partyId && { partyId: data.partyId }),
          ...(data.date && { date: data.date }),
          ...(data.status && { status: data.status }),
          ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
          ...(data.subtotal !== undefined && { subtotal: data.subtotal }),
          ...(data.discount !== undefined && { discount: data.discount }),
          ...(data.total !== undefined && { total: data.total }),
          ...(data.paidAmount !== undefined && { paidAmount: data.paidAmount }),
          ...(data.notes !== undefined && { notes: data.notes || null }),
        },
        include: {
          party: {
            select: {
              id: true,
              name: true,
              type: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: { items: true },
          },
        },
      });

      return updated as unknown as PurchaseWithRelations;
    });
  }

  async delete(id: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.purchase.findUnique({
        where: { id },
      });

      if (!existing) {
        throw AppError.notFound("Purchase not found");
      }

      if (existing.status === DocumentStatus.COMPLETED) {
        throw AppError.badRequest(
          "Cannot delete a completed purchase. Please cancel it first to properly revert stock levels."
        );
      }

      await tx.purchase.delete({
        where: { id },
      });
    });
  }
}

export const purchaseRepository = new PurchaseRepository();
