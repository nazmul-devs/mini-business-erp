import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductService } from "./product.service";
import { ProductRepository } from "./product.repository";
import { AppError } from "../../shared/errors";
import { StockMovementType } from "@erp/database";

describe("ProductService", () => {
  let productService: ProductService;
  let mockRepo: ProductRepository;

  const mockProduct = {
    id: "prod-1",
    name: "Wireless Optical Mouse",
    sku: "PRD-MOU-001",
    unit: "pcs",
    purchasePrice: 350,
    sellingPrice: 550,
    currentStock: 45,
    lowStockAt: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stockMovements: [],
    _count: { purchaseItems: 0, saleItems: 0, stockMovements: 1 },
  };

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findBySku: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasTransactions: vi.fn(),
      findMovementsByProductId: vi.fn(),
      adjustStock: vi.fn(),
    } as unknown as ProductRepository;

    productService = new ProductService(mockRepo);
  });

  describe("getProducts", () => {
    it("should return paginated list of products with isLowStock computed", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [mockProduct as any],
        total: 1,
      });

      const result = await productService.getProducts({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe("PRD-MOU-001");
      expect(result.items[0].isLowStock).toBe(false);
      expect(result.totalPages).toBe(1);
    });

    it("should flag isLowStock true when currentStock <= lowStockAt", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [{ ...mockProduct, currentStock: 3, lowStockAt: 10 } as any],
        total: 1,
      });

      const result = await productService.getProducts({ page: 1, limit: 10 });
      expect(result.items[0].isLowStock).toBe(true);
    });
  });

  describe("getProductById", () => {
    it("should return product with movements and counts", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);

      const result = await productService.getProductById("prod-1");
      expect(result.id).toBe("prod-1");
      expect(result.name).toBe("Wireless Optical Mouse");
    });

    it("should throw not found error if product does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(productService.getProductById("unknown")).rejects.toThrow(
        AppError.notFound("Product not found")
      );
    });
  });

  describe("createProduct", () => {
    it("should throw conflict error if SKU already exists", async () => {
      vi.mocked(mockRepo.findBySku).mockResolvedValue(mockProduct as any);

      await expect(
        productService.createProduct({
          name: "Duplicate SKU Mouse",
          sku: "PRD-MOU-001",
          unit: "pcs",
          purchasePrice: 300,
          sellingPrice: 500,
          initialStock: 10,
          lowStockAt: 5,
          isActive: true,
        })
      ).rejects.toThrow(AppError.conflict('Product with SKU "PRD-MOU-001" already exists'));
    });

    it("should create product with initial stock", async () => {
      vi.mocked(mockRepo.findBySku).mockResolvedValue(null);
      vi.mocked(mockRepo.create).mockResolvedValue(mockProduct as any);

      const result = await productService.createProduct({
        name: "Wireless Optical Mouse",
        sku: "PRD-MOU-001",
        unit: "pcs",
        purchasePrice: 350,
        sellingPrice: 550,
        initialStock: 45,
        lowStockAt: 10,
        isActive: true,
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.sku).toBe("PRD-MOU-001");
    });
  });

  describe("updateProduct", () => {
    it("should throw not found error if product does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        productService.updateProduct("unknown", { name: "Updated" })
      ).rejects.toThrow(AppError.notFound("Product not found"));
    });

    it("should throw conflict if updating to an existing SKU", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepo.findBySku).mockResolvedValue({
        ...mockProduct,
        id: "prod-2",
        sku: "OTHER-SKU",
      } as any);

      await expect(
        productService.updateProduct("prod-1", { sku: "OTHER-SKU" })
      ).rejects.toThrow(AppError.conflict('Another product with SKU "OTHER-SKU" already exists'));
    });

    it("should update product successfully", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepo.findBySku).mockResolvedValue(null);
      vi.mocked(mockRepo.update).mockResolvedValue({
        ...mockProduct,
        sellingPrice: 599,
      } as any);

      const result = await productService.updateProduct("prod-1", { sellingPrice: 599 });
      expect(result.sellingPrice).toBe(599);
    });
  });

  describe("deleteProduct", () => {
    it("should throw not found error if product does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(productService.deleteProduct("unknown")).rejects.toThrow(
        AppError.notFound("Product not found")
      );
    });

    it("should throw bad request if product has transactions", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepo.hasTransactions).mockResolvedValue(true);

      await expect(productService.deleteProduct("prod-1")).rejects.toThrow(
        AppError.badRequest("Cannot delete product with existing sales or purchases records")
      );
    });

    it("should delete product when no transactions exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepo.hasTransactions).mockResolvedValue(false);
      vi.mocked(mockRepo.delete).mockResolvedValue(mockProduct as any);

      await expect(productService.deleteProduct("prod-1")).resolves.toBeUndefined();
      expect(mockRepo.delete).toHaveBeenCalledWith("prod-1");
    });
  });

  describe("getProductMovements & adjustStock", () => {
    it("should return movements for a product", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockProduct as any);
      vi.mocked(mockRepo.findMovementsByProductId).mockResolvedValue({
        items: [
          {
            id: "mov-1",
            productId: "prod-1",
            type: StockMovementType.ADJUSTMENT_IN,
            quantity: 10 as any,
            referenceType: "MANUAL_ADJUSTMENT",
            referenceId: "ADJ-1",
            note: "Inventory count reconciliation",
            createdAt: new Date(),
          } as any,
        ],
        total: 1,
      });

      const result = await productService.getProductMovements("prod-1", { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(10);
      expect(result.items[0].type).toBe(StockMovementType.ADJUSTMENT_IN);
    });

    it("should adjust stock and return updated product and movement record", async () => {
      vi.mocked(mockRepo.adjustStock).mockResolvedValue({
        product: { ...mockProduct, currentStock: 55 } as any,
        movement: {
          id: "mov-new",
          productId: "prod-1",
          type: StockMovementType.ADJUSTMENT_IN,
          quantity: 10 as any,
          referenceType: "MANUAL_ADJUSTMENT",
          referenceId: "ADJ-123",
          note: "Stock addition",
          createdAt: new Date(),
        } as any,
      });

      const result = await productService.adjustStock("prod-1", {
        type: "ADJUSTMENT_IN",
        quantity: 10,
        note: "Stock addition",
      });

      expect(result.product.currentStock).toBe(55);
      expect(result.movement.quantity).toBe(10);
      expect(result.movement.type).toBe("ADJUSTMENT_IN");
    });
  });
});
