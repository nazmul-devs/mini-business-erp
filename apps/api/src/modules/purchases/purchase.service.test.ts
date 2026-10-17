import { describe, it, expect, vi, beforeEach } from "vitest";
import { PurchaseService } from "./purchase.service";
import { PurchaseRepository } from "./purchase.repository";
import { AppError } from "../../shared/errors";
import { DocumentStatus, PaymentStatus, PartyType } from "@erp/database";

describe("PurchaseService", () => {
  let purchaseService: PurchaseService;
  let mockRepo: PurchaseRepository;
  let mockDb: any;

  const mockParty = {
    id: "party-vendor-1",
    name: "Tech Importers Ltd",
    type: PartyType.VENDOR,
    email: "vendor@techimporters.com",
    phone: "01711223344",
    address: "Motijheel, Dhaka",
    openingBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: "prod-1",
    name: "Mechanical Keyboard",
    sku: "PRD-KEY-001",
    unit: "pcs",
    purchasePrice: 1200,
    sellingPrice: 1800,
    currentStock: 10,
    lowStockAt: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPurchase = {
    id: "pur-1",
    purchaseNo: "PUR-20261017-0001",
    partyId: "party-vendor-1",
    party: {
      id: "party-vendor-1",
      name: "Tech Importers Ltd",
      type: "VENDOR",
      email: "vendor@techimporters.com",
      phone: "01711223344",
      address: "Motijheel, Dhaka",
    },
    date: new Date("2026-10-17"),
    status: DocumentStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    subtotal: 12000,
    discount: 500,
    total: 11500,
    paidAmount: 11500,
    notes: "Order delivered on time",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-1",
        purchaseId: "pur-1",
        productId: "prod-1",
        quantity: 10,
        unitCost: 1200,
        lineTotal: 12000,
        product: {
          id: "prod-1",
          name: "Mechanical Keyboard",
          sku: "PRD-KEY-001",
          unit: "pcs",
        },
      },
    ],
    _count: { items: 1 },
  };

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByPurchaseNo: vi.fn(),
      generatePurchaseNo: vi.fn().mockResolvedValue("PUR-20261017-0002"),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as PurchaseRepository;

    mockDb = {
      party: {
        findUnique: vi.fn().mockResolvedValue(mockParty),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
      },
    };

    purchaseService = new PurchaseService(mockRepo, mockDb);
  });

  describe("getPurchases", () => {
    it("should return paginated list of purchases with totalPages", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [mockPurchase as any],
        total: 1,
      });

      const result = await purchaseService.getPurchases({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].purchaseNo).toBe("PUR-20261017-0001");
      expect(result.items[0].subtotal).toBe(12000);
      expect(result.items[0].total).toBe(11500);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getPurchaseById", () => {
    it("should return purchase when found", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockPurchase as any);

      const result = await purchaseService.getPurchaseById("pur-1");
      expect(result.id).toBe("pur-1");
      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].product?.sku).toBe("PRD-KEY-001");
    });

    it("should throw not found error if purchase does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(purchaseService.getPurchaseById("invalid-id")).rejects.toThrow(
        AppError.notFound("Purchase not found")
      );
    });
  });

  describe("createPurchase", () => {
    it("should reject if party does not exist", async () => {
      mockDb.party.findUnique.mockResolvedValue(null);

      await expect(
        purchaseService.createPurchase({
          partyId: "missing-party",
          items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }],
        })
      ).rejects.toThrow(AppError.notFound("Party not found"));
    });

    it("should reject if party is strictly CLIENT", async () => {
      mockDb.party.findUnique.mockResolvedValue({
        ...mockParty,
        type: PartyType.CLIENT,
      });

      await expect(
        purchaseService.createPurchase({
          partyId: "client-id",
          items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }],
        })
      ).rejects.toThrow(/purchases can only be made from vendors/i);
    });

    it("should reject if product is missing or inactive", async () => {
      mockDb.product.findMany.mockResolvedValue([]);

      await expect(
        purchaseService.createPurchase({
          partyId: "party-vendor-1",
          items: [{ productId: "prod-missing", quantity: 2, unitCost: 100 }],
        })
      ).rejects.toThrow(/one or more products specified in the purchase were not found/i);

      mockDb.product.findMany.mockResolvedValue([{ ...mockProduct, isActive: false }]);

      await expect(
        purchaseService.createPurchase({
          partyId: "party-vendor-1",
          items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }],
        })
      ).rejects.toThrow(/is inactive/i);
    });

    it("should reject if discount is greater than subtotal", async () => {
      await expect(
        purchaseService.createPurchase({
          partyId: "party-vendor-1",
          discount: 500,
          items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }], // subtotal = 200
        })
      ).rejects.toThrow(/discount cannot be greater than subtotal/i);
    });

    it("should calculate lineTotal, subtotal, and derive paymentStatus accurately", async () => {
      vi.mocked(mockRepo.create).mockImplementation(async (data: any) => ({
        ...mockPurchase,
        ...data,
      }));

      // Test 1: Full Payment -> PAID
      const resPaid = await purchaseService.createPurchase({
        partyId: "party-vendor-1",
        discount: 20,
        paidAmount: 180,
        items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }], // subtotal 200, total 180
      });
      expect(resPaid.paymentStatus).toBe(PaymentStatus.PAID);
      expect(resPaid.total).toBe(180);

      // Test 2: Partial Payment -> PARTIAL
      const resPartial = await purchaseService.createPurchase({
        partyId: "party-vendor-1",
        paidAmount: 50,
        items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }], // total 200
      });
      expect(resPartial.paymentStatus).toBe(PaymentStatus.PARTIAL);

      // Test 3: Zero Payment -> UNPAID
      const resUnpaid = await purchaseService.createPurchase({
        partyId: "party-vendor-1",
        paidAmount: 0,
        items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }], // total 200
      });
      expect(resUnpaid.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it("should check conflict when explicit purchaseNo is supplied and exists", async () => {
      vi.mocked(mockRepo.findByPurchaseNo).mockResolvedValue(mockPurchase as any);

      await expect(
        purchaseService.createPurchase({
          purchaseNo: "PUR-20261017-0001",
          partyId: "party-vendor-1",
          items: [{ productId: "prod-1", quantity: 2, unitCost: 100 }],
        })
      ).rejects.toThrow(AppError.conflict('Purchase number "PUR-20261017-0001" is already in use'));
    });
  });

  describe("updatePurchase", () => {
    it("should throw not found if purchase does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        purchaseService.updatePurchase("invalid-id", { notes: "Updated" })
      ).rejects.toThrow(AppError.notFound("Purchase not found"));
    });

    it("should reject modifying items of an already completed purchase", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockPurchase as any); // status is COMPLETED

      await expect(
        purchaseService.updatePurchase("pur-1", {
          items: [{ productId: "prod-1", quantity: 5, unitCost: 1200 }],
        })
      ).rejects.toThrow(/cannot modify line items of an already completed purchase/i);
    });

    it("should update editable fields on completed purchase and re-evaluate paymentStatus", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue({
        ...mockPurchase,
        subtotal: 1000,
        discount: 0,
        total: 1000,
        paidAmount: 500,
        paymentStatus: PaymentStatus.PARTIAL,
      } as any);

      vi.mocked(mockRepo.update).mockImplementation(async (id, data: any) => ({
        ...mockPurchase,
        id,
        ...data,
      }));

      const updated = await purchaseService.updatePurchase("pur-1", {
        paidAmount: 1000,
        notes: "Paid in full now",
      });

      expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
      expect(updated.paidAmount).toBe(1000);
      expect(updated.notes).toBe("Paid in full now");
    });
  });

  describe("deletePurchase", () => {
    it("should delegate delete to repository", async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue();

      await purchaseService.deletePurchase("pur-1");
      expect(mockRepo.delete).toHaveBeenCalledWith("pur-1");
    });
  });
});
