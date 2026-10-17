import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaleService } from "./sale.service";
import { SaleRepository } from "./sale.repository";
import { AppError } from "../../shared/errors";
import { DocumentStatus, PaymentStatus, PartyType } from "@erp/database";

describe("SaleService", () => {
  let saleService: SaleService;
  let mockRepo: SaleRepository;
  let mockDb: any;

  const mockClientParty = {
    id: "party-client-1",
    name: "Apex Enterprises",
    type: PartyType.CLIENT,
    email: "procurement@apex.com",
    phone: "01811223344",
    address: "Gulshan, Dhaka",
    openingBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: "prod-1",
    name: "Wireless Mouse",
    sku: "PRD-MOU-001",
    unit: "pcs",
    purchasePrice: 350,
    sellingPrice: 550,
    currentStock: 50,
    lowStockAt: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSale = {
    id: "sale-1",
    invoiceNo: "INV-20261017-0001",
    partyId: "party-client-1",
    party: {
      id: "party-client-1",
      name: "Apex Enterprises",
      type: "CLIENT",
      email: "procurement@apex.com",
      phone: "01811223344",
      address: "Gulshan, Dhaka",
    },
    date: new Date("2026-10-17"),
    status: DocumentStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    subtotal: 5500,
    discount: 500,
    total: 5000,
    paidAmount: 5000,
    notes: "Counter sale delivered",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: "item-1",
        saleId: "sale-1",
        productId: "prod-1",
        quantity: 10,
        unitPrice: 550,
        unitCostAtSale: 350,
        lineTotal: 5500,
        product: {
          id: "prod-1",
          name: "Wireless Mouse",
          sku: "PRD-MOU-001",
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
      findByInvoiceNo: vi.fn(),
      generateInvoiceNo: vi.fn().mockResolvedValue("INV-20261017-0002"),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as SaleRepository;

    mockDb = {
      party: {
        findUnique: vi.fn().mockResolvedValue(mockClientParty),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([mockProduct]),
      },
    };

    saleService = new SaleService(mockRepo, mockDb);
  });

  describe("getSales", () => {
    it("should return paginated list of sales with totalPages", async () => {
      vi.mocked(mockRepo.findMany).mockResolvedValue({
        items: [mockSale as any],
        total: 1,
      });

      const result = await saleService.getSales({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].invoiceNo).toBe("INV-20261017-0001");
      expect(result.items[0].subtotal).toBe(5500);
      expect(result.items[0].total).toBe(5000);
      expect(result.totalPages).toBe(1);
    });
  });

  describe("getSaleById", () => {
    it("should return sale when found", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockSale as any);

      const result = await saleService.getSaleById("sale-1");
      expect(result.id).toBe("sale-1");
      expect(result.items).toHaveLength(1);
      expect(result.items?.[0].unitCostAtSale).toBe(350);
      expect(result.items?.[0].product?.sku).toBe("PRD-MOU-001");
    });

    it("should throw not found error if sale does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(saleService.getSaleById("missing-id")).rejects.toThrow(
        AppError.notFound("Sale not found")
      );
    });
  });

  describe("createSale", () => {
    it("should reject if party does not exist", async () => {
      mockDb.party.findUnique.mockResolvedValue(null);

      await expect(
        saleService.createSale({
          partyId: "missing-party",
          items: [{ productId: "prod-1", quantity: 2 }],
        })
      ).rejects.toThrow(AppError.notFound("Party not found"));
    });

    it("should reject if party is strictly VENDOR", async () => {
      mockDb.party.findUnique.mockResolvedValue({
        ...mockClientParty,
        type: PartyType.VENDOR,
      });

      await expect(
        saleService.createSale({
          partyId: "vendor-id",
          items: [{ productId: "prod-1", quantity: 2 }],
        })
      ).rejects.toThrow(/sales invoices can only be issued to clients or both/i);
    });

    it("should reject if product is missing or inactive", async () => {
      mockDb.product.findMany.mockResolvedValue([]);

      await expect(
        saleService.createSale({
          partyId: "party-client-1",
          items: [{ productId: "prod-missing", quantity: 2 }],
        })
      ).rejects.toThrow(/one or more products specified in the sale were not found/i);

      mockDb.product.findMany.mockResolvedValue([{ ...mockProduct, isActive: false }]);

      await expect(
        saleService.createSale({
          partyId: "party-client-1",
          items: [{ productId: "prod-1", quantity: 2 }],
        })
      ).rejects.toThrow(/is inactive/i);
    });

    it("should reject if requested quantity exceeds available stock on completed sale", async () => {
      mockDb.product.findMany.mockResolvedValue([{ ...mockProduct, currentStock: 5 }]);

      await expect(
        saleService.createSale({
          partyId: "party-client-1",
          status: "COMPLETED",
          items: [{ productId: "prod-1", quantity: 10 }], // 10 > 5 available
        })
      ).rejects.toThrow(/insufficient stock/i);
    });

    it("should reject if discount is greater than subtotal", async () => {
      await expect(
        saleService.createSale({
          partyId: "party-client-1",
          discount: 2000,
          items: [{ productId: "prod-1", quantity: 2, unitPrice: 500 }], // subtotal = 1000
        })
      ).rejects.toThrow(/discount cannot be greater than subtotal/i);
    });

    it("should snapshot unitCostAtSale and derive paymentStatus accurately", async () => {
      vi.mocked(mockRepo.create).mockImplementation(async (data: any) => ({
        ...mockSale,
        ...data,
      }));

      // Test 1: Full Payment -> PAID
      const resPaid = await saleService.createSale({
        partyId: "party-client-1",
        discount: 100,
        paidAmount: 1000,
        items: [{ productId: "prod-1", quantity: 2, unitPrice: 550 }], // subtotal 1100, total 1000
      });

      expect(resPaid.paymentStatus).toBe(PaymentStatus.PAID);
      expect(resPaid.total).toBe(1000);
      expect(vi.mocked(mockRepo.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              unitPrice: 550,
              unitCostAtSale: 350, // snapshotted from product.purchasePrice
              lineTotal: 1100,
            }),
          ],
        })
      );

      // Test 2: Partial Payment -> PARTIAL
      const resPartial = await saleService.createSale({
        partyId: "party-client-1",
        paidAmount: 400,
        items: [{ productId: "prod-1", quantity: 2 }], // defaults unitPrice to product.sellingPrice (550)
      });
      expect(resPartial.paymentStatus).toBe(PaymentStatus.PARTIAL);

      // Test 3: Zero Payment -> UNPAID
      const resUnpaid = await saleService.createSale({
        partyId: "party-client-1",
        paidAmount: 0,
        items: [{ productId: "prod-1", quantity: 2 }],
      });
      expect(resUnpaid.paymentStatus).toBe(PaymentStatus.UNPAID);
    });

    it("should check conflict when explicit invoiceNo is supplied and exists", async () => {
      vi.mocked(mockRepo.findByInvoiceNo).mockResolvedValue(mockSale as any);

      await expect(
        saleService.createSale({
          invoiceNo: "INV-20261017-0001",
          partyId: "party-client-1",
          items: [{ productId: "prod-1", quantity: 2 }],
        })
      ).rejects.toThrow(AppError.conflict('Invoice number "INV-20261017-0001" is already in use'));
    });
  });

  describe("updateSale", () => {
    it("should throw not found if sale does not exist", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      await expect(
        saleService.updateSale("invalid-id", { notes: "Updated" })
      ).rejects.toThrow(AppError.notFound("Sale not found"));
    });

    it("should reject modifying items of an already completed sale", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(mockSale as any); // status is COMPLETED

      await expect(
        saleService.updateSale("sale-1", {
          items: [{ productId: "prod-1", quantity: 5, unitPrice: 500 }],
        })
      ).rejects.toThrow(/cannot modify line items of an already completed sale/i);
    });

    it("should update editable fields on completed sale and re-evaluate paymentStatus", async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue({
        ...mockSale,
        subtotal: 1000,
        discount: 0,
        total: 1000,
        paidAmount: 400,
        paymentStatus: PaymentStatus.PARTIAL,
      } as any);

      vi.mocked(mockRepo.update).mockImplementation(async (id, data: any) => ({
        ...mockSale,
        id,
        ...data,
      }));

      const updated = await saleService.updateSale("sale-1", {
        paidAmount: 1000,
        notes: "Paid in full via card",
      });

      expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
      expect(updated.paidAmount).toBe(1000);
      expect(updated.notes).toBe("Paid in full via card");
    });
  });

  describe("deleteSale", () => {
    it("should delegate delete to repository", async () => {
      vi.mocked(mockRepo.delete).mockResolvedValue();

      await saleService.deleteSale("sale-1");
      expect(mockRepo.delete).toHaveBeenCalledWith("sale-1");
    });
  });
});
