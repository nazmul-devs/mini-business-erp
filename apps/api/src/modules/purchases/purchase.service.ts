import {
  CreatePurchaseInput,
  PaginatedResult,
  PurchaseItemDetail,
  PurchaseQueryInput,
  PurchaseRecord,
  UpdatePurchaseInput,
} from "@erp/shared";
import { DocumentStatus, PaymentStatus, PartyType, PrismaClient, prisma } from "@erp/database";
import { AppError } from "../../shared/errors";
import {
  PurchaseRepository,
  PurchaseWithRelations,
  purchaseRepository,
} from "./purchase.repository";

export class PurchaseService {
  constructor(
    private readonly repo: PurchaseRepository = purchaseRepository,
    private readonly db: PrismaClient = prisma
  ) {}

  private mapToRecord(purchase: PurchaseWithRelations): PurchaseRecord {
    return {
      id: purchase.id,
      purchaseNo: purchase.purchaseNo,
      partyId: purchase.partyId,
      party: purchase.party
        ? {
            id: purchase.party.id,
            name: purchase.party.name,
            type: purchase.party.type as PartyType,
            email: purchase.party.email,
            phone: purchase.party.phone,
          }
        : undefined,
      date: purchase.date,
      status: purchase.status as DocumentStatus,
      paymentStatus: purchase.paymentStatus as PaymentStatus,
      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount),
      total: Number(purchase.total),
      paidAmount: Number(purchase.paidAmount),
      notes: purchase.notes,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      items: purchase.items?.map(
        (item): PurchaseItemDetail => ({
          id: item.id,
          purchaseId: item.purchaseId,
          productId: item.productId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          lineTotal: Number(item.lineTotal),
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                sku: item.product.sku,
                unit: item.product.unit,
              }
            : undefined,
        })
      ),
      _count: purchase._count,
    };
  }

  async getPurchases(query: PurchaseQueryInput): Promise<PaginatedResult<PurchaseRecord>> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { items, total } = await this.repo.findMany({
      ...query,
      status: query.status as DocumentStatus | undefined,
      paymentStatus: query.paymentStatus as PaymentStatus | undefined,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((p) => this.mapToRecord(p)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPurchaseById(id: string): Promise<PurchaseRecord> {
    const purchase = await this.repo.findById(id);
    if (!purchase) {
      throw AppError.notFound("Purchase not found");
    }

    return this.mapToRecord(purchase);
  }

  async createPurchase(data: CreatePurchaseInput): Promise<PurchaseRecord> {
    const party = await this.db.party.findUnique({
      where: { id: data.partyId },
    });

    if (!party) {
      throw AppError.notFound("Party not found");
    }

    if (party.type === PartyType.CLIENT) {
      throw AppError.badRequest(
        `Selected party "${party.name}" is registered as a Client. Purchases can only be made from Vendors or Both.`
      );
    }

    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest("At least one line item is required in a purchase");
    }

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await this.db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw AppError.badRequest("One or more products specified in the purchase were not found");
    }

    const inactiveProduct = products.find((p) => !p.isActive);
    if (inactiveProduct) {
      throw AppError.badRequest(`Product "${inactiveProduct.name}" (${inactiveProduct.sku}) is inactive`);
    }

    const calculatedItems = data.items.map((item) => {
      const qty = Number(item.quantity);
      const cost = Number(item.unitCost);
      const lineTotal = Math.round(qty * cost * 100) / 100;
      return {
        productId: item.productId,
        quantity: qty,
        unitCost: cost,
        lineTotal,
      };
    });

    const subtotal = calculatedItems.reduce((acc, i) => acc + i.lineTotal, 0);
    const discount = Math.max(0, Number(data.discount || 0));

    if (discount > subtotal) {
      throw AppError.badRequest("Discount cannot be greater than subtotal");
    }

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const paidAmount = Math.max(0, Number(data.paidAmount || 0));

    let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
    if (paidAmount >= total && total > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    } else if (total === 0 && paidAmount === 0) {
      paymentStatus = PaymentStatus.PAID;
    }

    let purchaseNo = data.purchaseNo?.trim();
    if (purchaseNo) {
      const existing = await this.repo.findByPurchaseNo(purchaseNo);
      if (existing) {
        throw AppError.conflict(`Purchase number "${purchaseNo}" is already in use`);
      }
    } else {
      purchaseNo = await this.repo.generatePurchaseNo();
    }

    const status = (data.status as DocumentStatus) || DocumentStatus.COMPLETED;

    const created = await this.repo.create({
      purchaseNo,
      partyId: data.partyId,
      date: data.date ? new Date(data.date) : new Date(),
      status,
      paymentStatus,
      subtotal,
      discount,
      total,
      paidAmount,
      notes: data.notes?.trim() || null,
      items: calculatedItems,
    });

    return this.mapToRecord(created);
  }

  async updatePurchase(id: string, data: UpdatePurchaseInput): Promise<PurchaseRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Purchase not found");
    }

    if (data.partyId) {
      const party = await this.db.party.findUnique({
        where: { id: data.partyId },
      });

      if (!party) {
        throw AppError.notFound("Party not found");
      }

      if (party.type === PartyType.CLIENT) {
        throw AppError.badRequest(
          `Selected party "${party.name}" is registered as a Client. Purchases can only be made from Vendors or Both.`
        );
      }
    }

    let calculatedItems = undefined;
    let subtotal = Number(existing.subtotal);

    if (data.items) {
      if (existing.status === DocumentStatus.COMPLETED) {
        throw AppError.badRequest("Cannot modify line items of an already completed purchase");
      }

      const productIds = [...new Set(data.items.map((i) => i.productId))];
      const products = await this.db.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw AppError.badRequest("One or more products specified in the purchase were not found");
      }

      calculatedItems = data.items.map((item) => {
        const qty = Number(item.quantity);
        const cost = Number(item.unitCost);
        return {
          productId: item.productId,
          quantity: qty,
          unitCost: cost,
          lineTotal: Math.round(qty * cost * 100) / 100,
        };
      });

      subtotal = calculatedItems.reduce((acc, i) => acc + i.lineTotal, 0);
    }

    const discount =
      data.discount !== undefined ? Math.max(0, Number(data.discount)) : Number(existing.discount);

    if (discount > subtotal) {
      throw AppError.badRequest("Discount cannot be greater than subtotal");
    }

    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const paidAmount =
      data.paidAmount !== undefined ? Math.max(0, Number(data.paidAmount)) : Number(existing.paidAmount);

    let paymentStatus: PaymentStatus = existing.paymentStatus as PaymentStatus;
    if (paidAmount >= total && total > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    } else {
      paymentStatus = PaymentStatus.UNPAID;
    }

    const updated = await this.repo.update(id, {
      partyId: data.partyId,
      date: data.date ? new Date(data.date) : undefined,
      status: data.status as DocumentStatus | undefined,
      paymentStatus,
      subtotal,
      discount,
      total,
      paidAmount,
      notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
      items: calculatedItems,
    });

    return this.mapToRecord(updated);
  }

  async deletePurchase(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

export const purchaseService = new PurchaseService();
