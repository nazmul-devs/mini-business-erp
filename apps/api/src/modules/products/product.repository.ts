import { prisma, Product, StockMovement, StockMovementType, Prisma } from "@erp/database";
import { CreateProductInput, ProductQueryInput, StockAdjustmentInput, UpdateProductInput } from "@erp/shared";
import { AppError } from "../../shared/errors";

export class ProductRepository {
  async findMany(query: ProductQueryInput): Promise<{ items: Product[]; total: number }> {
    const { search, isActive, lowStock, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    if (lowStock === "true") {
      const activeFilter = isActive !== undefined ? Prisma.sql`AND "isActive" = ${isActive === "true"}` : Prisma.empty;
      const searchFilter = search && search.trim()
        ? Prisma.sql`AND ("name" ILIKE ${`%${search.trim()}%`} OR "sku" ILIKE ${`%${search.trim()}%`})`
        : Prisma.empty;

      const [items, totalResult] = await Promise.all([
        prisma.$queryRaw<Product[]>`
          SELECT * FROM "Product"
          WHERE "currentStock" <= "lowStockAt"
          ${activeFilter}
          ${searchFilter}
          ORDER BY "createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count FROM "Product"
          WHERE "currentStock" <= "lowStockAt"
          ${activeFilter}
          ${searchFilter}
        `,
      ]);

      const total = Number(totalResult[0]?.count || 0);
      return { items, total };
    }

    const where: Prisma.ProductWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            purchaseItems: true,
            saleItems: true,
            stockMovements: true,
          },
        },
      },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku: sku.trim() },
    });
  }

  async create(data: CreateProductInput): Promise<Product> {
    return prisma.$transaction(async (tx) => {
      const initialStock = Number(data.initialStock || 0);

      const product = await tx.product.create({
        data: {
          name: data.name.trim(),
          sku: data.sku.trim(),
          unit: data.unit || "pcs",
          purchasePrice: data.purchasePrice ?? 0,
          sellingPrice: data.sellingPrice ?? 0,
          currentStock: initialStock,
          lowStockAt: data.lowStockAt ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: StockMovementType.ADJUSTMENT_IN,
            quantity: initialStock,
            referenceType: "INITIAL_STOCK",
            referenceId: `INIT-${product.id}`,
            note: "Initial inventory registered on product creation",
          },
        });
      }

      return product;
    });
  }

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.sku !== undefined && { sku: data.sku.trim() }),
        ...(data.unit !== undefined && { unit: data.unit.trim() }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.lowStockAt !== undefined && { lowStockAt: data.lowStockAt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(id: string): Promise<Product> {
    return prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({
        where: { productId: id },
      });
      return tx.product.delete({
        where: { id },
      });
    });
  }

  async hasTransactions(id: string): Promise<boolean> {
    const counts = await prisma.product.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            purchaseItems: true,
            saleItems: true,
          },
        },
      },
    });

    if (!counts) return false;
    return counts._count.purchaseItems > 0 || counts._count.saleItems > 0;
  }

  async findMovementsByProductId(
    productId: string,
    options: { page: number; limit: number }
  ): Promise<{ items: StockMovement[]; total: number }> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.count({ where: { productId } }),
    ]);

    return { items, total };
  }

  async adjustStock(
    productId: string,
    data: StockAdjustmentInput
  ): Promise<{ product: Product; movement: StockMovement }> {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw AppError.notFound("Product not found");
      }

      const currentStock = Number(product.currentStock);
      const adjustmentQty = Number(data.quantity);

      let newStock = currentStock;

      if (data.type === StockMovementType.ADJUSTMENT_IN) {
        newStock = currentStock + adjustmentQty;
      } else if (data.type === StockMovementType.ADJUSTMENT_OUT) {
        if (currentStock < adjustmentQty) {
          throw AppError.badRequest(
            `Insufficient stock for adjustment. Current: ${currentStock} ${product.unit}, Requested reduction: ${adjustmentQty} ${product.unit}`
          );
        }
        newStock = currentStock - adjustmentQty;
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: data.type as StockMovementType,
          quantity: adjustmentQty,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: `ADJ-${Date.now()}`,
          note: data.note || null,
        },
      });

      return { product: updatedProduct, movement };
    });
  }
}

export const productRepository = new ProductRepository();
