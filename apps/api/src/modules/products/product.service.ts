import {
  CreateProductInput,
  PaginatedResult,
  ProductItem,
  ProductQueryInput,
  StockAdjustmentInput,
  StockMovementItem,
  UpdateProductInput,
} from "@erp/shared";
import { AppError } from "../../shared/errors";
import { ProductRepository, productRepository } from "./product.repository";

export class ProductService {
  constructor(private readonly repo: ProductRepository = productRepository) {}

  async getProducts(query: ProductQueryInput): Promise<PaginatedResult<ProductItem>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.repo.findMany({ ...query, page, limit });
    const totalPages = Math.ceil(total / limit) || 1;

    const enrichedItems: ProductItem[] = items.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      currentStock: Number(product.currentStock),
      lowStockAt: Number(product.lowStockAt),
      isActive: product.isActive,
      isLowStock: Number(product.currentStock) <= Number(product.lowStockAt),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    return {
      items: enrichedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getProductById(id: string): Promise<ProductItem & { _count?: { purchaseItems: number; saleItems: number; stockMovements: number } }> {
    const product = await this.repo.findById(id);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      currentStock: Number(product.currentStock),
      lowStockAt: Number(product.lowStockAt),
      isActive: product.isActive,
      isLowStock: Number(product.currentStock) <= Number(product.lowStockAt),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      stockMovements: product.stockMovements.map((m) => ({
        id: m.id,
        productId: m.productId,
        type: m.type,
        quantity: Number(m.quantity),
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        note: m.note,
        createdAt: m.createdAt,
      })),
      _count: product._count,
    };
  }

  async createProduct(data: CreateProductInput): Promise<ProductItem> {
    const existing = await this.repo.findBySku(data.sku);
    if (existing) {
      throw AppError.conflict(`Product with SKU "${data.sku}" already exists`);
    }

    const created = await this.repo.create(data);

    return {
      id: created.id,
      name: created.name,
      sku: created.sku,
      unit: created.unit,
      purchasePrice: Number(created.purchasePrice),
      sellingPrice: Number(created.sellingPrice),
      currentStock: Number(created.currentStock),
      lowStockAt: Number(created.lowStockAt),
      isActive: created.isActive,
      isLowStock: Number(created.currentStock) <= Number(created.lowStockAt),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async updateProduct(id: string, data: UpdateProductInput): Promise<ProductItem> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Product not found");
    }

    if (data.sku && data.sku.trim().toLowerCase() !== existing.sku.toLowerCase()) {
      const skuConflict = await this.repo.findBySku(data.sku);
      if (skuConflict && skuConflict.id !== id) {
        throw AppError.conflict(`Another product with SKU "${data.sku}" already exists`);
      }
    }

    const updated = await this.repo.update(id, data);

    return {
      id: updated.id,
      name: updated.name,
      sku: updated.sku,
      unit: updated.unit,
      purchasePrice: Number(updated.purchasePrice),
      sellingPrice: Number(updated.sellingPrice),
      currentStock: Number(updated.currentStock),
      lowStockAt: Number(updated.lowStockAt),
      isActive: updated.isActive,
      isLowStock: Number(updated.currentStock) <= Number(updated.lowStockAt),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteProduct(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Product not found");
    }

    const inUse = await this.repo.hasTransactions(id);
    if (inUse) {
      throw AppError.badRequest("Cannot delete product with existing sales or purchases records");
    }

    await this.repo.delete(id);
  }

  async getProductMovements(
    productId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<StockMovementItem>> {
    const product = await this.repo.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.repo.findMovementsByProductId(productId, { page, limit });
    const totalPages = Math.ceil(total / limit) || 1;

    const movementItems: StockMovementItem[] = items.map((m) => ({
      id: m.id,
      productId: m.productId,
      type: m.type,
      quantity: Number(m.quantity),
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      note: m.note,
      createdAt: m.createdAt,
    }));

    return {
      items: movementItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async adjustStock(
    productId: string,
    data: StockAdjustmentInput
  ): Promise<{ product: ProductItem; movement: StockMovementItem }> {
    const { product, movement } = await this.repo.adjustStock(productId, data);

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        purchasePrice: Number(product.purchasePrice),
        sellingPrice: Number(product.sellingPrice),
        currentStock: Number(product.currentStock),
        lowStockAt: Number(product.lowStockAt),
        isActive: product.isActive,
        isLowStock: Number(product.currentStock) <= Number(product.lowStockAt),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
      movement: {
        id: movement.id,
        productId: movement.productId,
        type: movement.type,
        quantity: Number(movement.quantity),
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        note: movement.note,
        createdAt: movement.createdAt,
      },
    };
  }
}

export const productService = new ProductService();
