import {
  prisma,
  Sale,
  SaleItem,
  DocumentStatus,
  PaymentStatus,
  StockMovementType,
  Prisma,
} from "@erp/database";
import { AppError } from "../../shared/errors";

export interface CreateSaleRepoInput {
  invoiceNo: string;
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
    unitPrice: number;
    unitCostAtSale: number;
    lineTotal: number;
  }>;
}

export interface UpdateSaleRepoInput {
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
    unitPrice: number;
    unitCostAtSale: number;
    lineTotal: number;
  }>;
}

export interface SaleQueryOptions {
  search?: string;
  partyId?: string;
  status?: DocumentStatus;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export type SaleWithRelations = Sale & {
  party: {
    id: string;
    name: string;
    type: string;
    email: string | null;
    phone: string | null;
    address?: string | null;
  };
  items: Array<
    SaleItem & {
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

export class SaleRepository {
  async findMany(query: SaleQueryOptions): Promise<{ items: SaleWithRelations[]; total: number }> {
    const { search, partyId, status, paymentStatus, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};

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
        { invoiceNo: { contains: term, mode: "insensitive" } },
        { party: { name: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
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
      prisma.sale.count({ where }),
    ]);

    return { items: items as unknown as SaleWithRelations[], total };
  }

  async findById(id: string): Promise<SaleWithRelations | null> {
    const sale = await prisma.sale.findUnique({
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

    return sale as unknown as SaleWithRelations | null;
  }

  async findByInvoiceNo(invoiceNo: string): Promise<Sale | null> {
    return prisma.sale.findUnique({
      where: { invoiceNo },
    });
  }

  async generateInvoiceNo(): Promise<string> {
    const profile = await prisma.businessProfile.findFirst();
    const prefix = profile?.invoicePrefix || "INV";

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const countToday = await prisma.sale.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const sequence = String(countToday + 1).padStart(4, "0");
    const candidate = `${prefix}-${dateStr}-${sequence}`;

    const exists = await this.findByInvoiceNo(candidate);
    if (!exists) {
      return candidate;
    }

    return `${prefix}-${dateStr}-${Date.now().toString().slice(-4)}`;
  }

  async create(data: CreateSaleRepoInput): Promise<SaleWithRelations> {
    return prisma.$transaction(async (tx) => {
      // 1. If COMPLETED, validate stock availability and deduct stock
      if (data.status === DocumentStatus.COMPLETED) {
        for (const item of data.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw AppError.notFound(`Product with ID "${item.productId}" not found`);
          }

          const currentStock = Number(product.currentStock);
          if (currentStock < item.quantity) {
            throw AppError.badRequest(
              `Insufficient stock for product "${product.name}". Available: ${currentStock} ${product.unit}, Requested: ${item.quantity} ${product.unit}`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });
        }
      }

      // 2. Create the Sale document and items
      const sale = await tx.sale.create({
        data: {
          invoiceNo: data.invoiceNo,
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
              unitPrice: item.unitPrice,
              unitCostAtSale: item.unitCostAtSale,
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

      // 3. If COMPLETED, write audit StockMovement records
      if (data.status === DocumentStatus.COMPLETED) {
        for (const item of data.items) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.SALE_OUT,
              quantity: item.quantity,
              referenceType: "SALE",
              referenceId: sale.id,
              note: `Sale invoice #${sale.invoiceNo} issued`,
            },
          });
        }
      }

      return sale as unknown as SaleWithRelations;
    });
  }

  async update(id: string, data: UpdateSaleRepoInput): Promise<SaleWithRelations> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existing) {
        throw AppError.notFound("Sale not found");
      }

      const prevStatus = existing.status;
      const nextStatus = data.status || prevStatus;

      // Case 1: Status changing from COMPLETED to CANCELLED -> Revert stock
      if (prevStatus === DocumentStatus.COMPLETED && nextStatus === DocumentStatus.CANCELLED) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: Number(item.quantity) },
            },
          });

          await tx.stockMovement.deleteMany({
            where: {
              productId: item.productId,
              referenceType: "SALE",
              referenceId: existing.id,
            },
          });
        }
      }

      // Case 2: Status changing from DRAFT to COMPLETED -> Check stock, decrement, write movements
      if (prevStatus === DocumentStatus.DRAFT && nextStatus === DocumentStatus.COMPLETED) {
        if (data.items && data.items.length > 0) {
          await tx.saleItem.deleteMany({ where: { saleId: id } });
          await tx.saleItem.createMany({
            data: data.items.map((item) => ({
              saleId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCostAtSale: item.unitCostAtSale,
              lineTotal: item.lineTotal,
            })),
          });
        }

        const itemsToProcess = data.items || existing.items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          unitCostAtSale: Number(i.unitCostAtSale),
          lineTotal: Number(i.lineTotal),
        }));

        for (const item of itemsToProcess) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw AppError.notFound(`Product with ID "${item.productId}" not found`);
          }

          const currentStock = Number(product.currentStock);
          if (currentStock < item.quantity) {
            throw AppError.badRequest(
              `Insufficient stock for "${product.name}". Available: ${currentStock} ${product.unit}, Requested: ${item.quantity} ${product.unit}`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: item.quantity },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.SALE_OUT,
              quantity: item.quantity,
              referenceType: "SALE",
              referenceId: existing.id,
              note: `Sale invoice #${existing.invoiceNo} issued`,
            },
          });
        }
      }

      // Case 3: Already COMPLETED staying COMPLETED -> Cannot modify line items
      if (prevStatus === DocumentStatus.COMPLETED && nextStatus === DocumentStatus.COMPLETED) {
        if (data.items && data.items.length > 0) {
          throw AppError.badRequest(
            "Cannot modify items of an already completed sale invoice. Cancel it first to adjust inventory."
          );
        }
      }

      // Case 4: DRAFT staying DRAFT -> Update items if provided
      if (prevStatus === DocumentStatus.DRAFT && nextStatus === DocumentStatus.DRAFT && data.items) {
        await tx.saleItem.deleteMany({ where: { saleId: id } });
        await tx.saleItem.createMany({
          data: data.items.map((item) => ({
            saleId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCostAtSale: item.unitCostAtSale,
            lineTotal: item.lineTotal,
          })),
        });
      }

      const updated = await tx.sale.update({
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

      return updated as unknown as SaleWithRelations;
    });
  }

  async delete(id: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id },
      });

      if (!existing) {
        throw AppError.notFound("Sale not found");
      }

      if (existing.status === DocumentStatus.COMPLETED) {
        throw AppError.badRequest(
          "Cannot delete a completed sale invoice. Please cancel it first to properly revert inventory levels."
        );
      }

      await tx.sale.delete({
        where: { id },
      });
    });
  }
}

export const saleRepository = new SaleRepository();
