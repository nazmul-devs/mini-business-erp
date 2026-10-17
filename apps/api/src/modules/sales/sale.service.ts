import {
  CreateSaleInput,
  PaginatedResult,
  SaleItemDetail,
  SaleQueryInput,
  SaleRecord,
  UpdateSaleInput,
} from "@erp/shared";
import { DocumentStatus, PaymentStatus, PartyType, PrismaClient, prisma } from "@erp/database";
import { AppError } from "../../shared/errors";
import {
  SaleRepository,
  SaleWithRelations,
  saleRepository,
} from "./sale.repository";

export class SaleService {
  constructor(
    private readonly repo: SaleRepository = saleRepository,
    private readonly db: PrismaClient = prisma
  ) {}

  private mapToRecord(sale: SaleWithRelations): SaleRecord {
    return {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      partyId: sale.partyId,
      party: sale.party
        ? {
            id: sale.party.id,
            name: sale.party.name,
            type: sale.party.type as PartyType,
            email: sale.party.email,
            phone: sale.party.phone,
            address: sale.party.address,
          }
        : undefined,
      date: sale.date,
      status: sale.status as DocumentStatus,
      paymentStatus: sale.paymentStatus as PaymentStatus,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
      paidAmount: Number(sale.paidAmount),
      notes: sale.notes,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      items: sale.items?.map(
        (item): SaleItemDetail => ({
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          unitCostAtSale: Number(item.unitCostAtSale),
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
      _count: sale._count,
    };
  }

  async getSales(query: SaleQueryInput): Promise<PaginatedResult<SaleRecord>> {
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
      items: items.map((s) => this.mapToRecord(s)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSaleById(id: string): Promise<SaleRecord> {
    const sale = await this.repo.findById(id);
    if (!sale) {
      throw AppError.notFound("Sale not found");
    }

    return this.mapToRecord(sale);
  }

  async createSale(data: CreateSaleInput): Promise<SaleRecord> {
    const party = await this.db.party.findUnique({
      where: { id: data.partyId },
    });

    if (!party) {
      throw AppError.notFound("Party not found");
    }

    if (party.type === PartyType.VENDOR) {
      throw AppError.badRequest(
        `Selected party "${party.name}" is registered as a Vendor. Sales invoices can only be issued to Clients or Both.`
      );
    }

    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest("At least one line item is required in a sale");
    }

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await this.db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw AppError.badRequest("One or more products specified in the sale were not found");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const status = (data.status as DocumentStatus) || DocumentStatus.COMPLETED;

    const calculatedItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!;

      if (!product.isActive) {
        throw AppError.badRequest(`Product "${product.name}" (${product.sku}) is inactive`);
      }

      const qty = Number(item.quantity);
      const price = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.sellingPrice);
      const costAtSale = Number(product.purchasePrice);

      if (status === DocumentStatus.COMPLETED) {
        const availableStock = Number(product.currentStock);
        if (availableStock < qty) {
          throw AppError.badRequest(
            `Insufficient stock for "${product.name}". Available: ${availableStock} ${product.unit}, Requested: ${qty} ${product.unit}`
          );
        }
      }

      const lineTotal = Math.round(qty * price * 100) / 100;

      return {
        productId: item.productId,
        quantity: qty,
        unitPrice: price,
        unitCostAtSale: costAtSale,
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

    let invoiceNo = data.invoiceNo?.trim();
    if (invoiceNo) {
      const existing = await this.repo.findByInvoiceNo(invoiceNo);
      if (existing) {
        throw AppError.conflict(`Invoice number "${invoiceNo}" is already in use`);
      }
    } else {
      invoiceNo = await this.repo.generateInvoiceNo();
    }

    const created = await this.repo.create({
      invoiceNo,
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

  async updateSale(id: string, data: UpdateSaleInput): Promise<SaleRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw AppError.notFound("Sale not found");
    }

    if (data.partyId) {
      const party = await this.db.party.findUnique({
        where: { id: data.partyId },
      });

      if (!party) {
        throw AppError.notFound("Party not found");
      }

      if (party.type === PartyType.VENDOR) {
        throw AppError.badRequest(
          `Selected party "${party.name}" is registered as a Vendor. Sales invoices can only be issued to Clients or Both.`
        );
      }
    }

    let calculatedItems = undefined;
    let subtotal = Number(existing.subtotal);

    if (data.items) {
      if (existing.status === DocumentStatus.COMPLETED) {
        throw AppError.badRequest("Cannot modify line items of an already completed sale invoice");
      }

      const productIds = [...new Set(data.items.map((i) => i.productId))];
      const products = await this.db.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw AppError.badRequest("One or more products specified in the sale were not found");
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      calculatedItems = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        if (!product.isActive) {
          throw AppError.badRequest(`Product "${product.name}" (${product.sku}) is inactive`);
        }

        const qty = Number(item.quantity);
        const price = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(product.sellingPrice);
        const costAtSale = Number(product.purchasePrice);
        const lineTotal = Math.round(qty * price * 100) / 100;

        return {
          productId: item.productId,
          quantity: qty,
          unitPrice: price,
          unitCostAtSale: costAtSale,
          lineTotal,
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

  async deleteSale(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

export const saleService = new SaleService();
