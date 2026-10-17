import { z } from "zod";

export const createPartySchema = z.object({
  name: z.string().trim().min(1, "Party name is required").max(120),
  type: z.enum(["VENDOR", "CLIENT", "BOTH"]),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  openingBalance: z.coerce.number().optional().default(0),
});

export const updatePartySchema = createPartySchema.partial();

export const partyQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(["VENDOR", "CLIENT", "BOTH"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const partySchema = createPartySchema;

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150),
  sku: z.string().trim().min(1, "SKU is required").max(50),
  unit: z.string().trim().default("pcs"),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive or zero").default(0),
  sellingPrice: z.coerce.number().min(0, "Selling price must be positive or zero").default(0),
  initialStock: z.coerce.number().min(0, "Initial stock cannot be negative").default(0),
  lowStockAt: z.coerce.number().min(0, "Low stock threshold cannot be negative").default(0),
  isActive: z.coerce.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150).optional(),
  sku: z.string().trim().min(1, "SKU is required").max(50).optional(),
  unit: z.string().trim().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  lowStockAt: z.coerce.number().min(0).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  lowStock: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const stockAdjustmentSchema = z.object({
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  note: z.string().trim().max(300).optional(),
});

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitCost: z.coerce.number().min(0, "Unit cost must be zero or positive"),
});

export const createPurchaseSchema = z.object({
  purchaseNo: z.string().trim().max(50).optional(),
  partyId: z.string().min(1, "Party is required"),
  date: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).optional().default("COMPLETED"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional().default(0),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative").optional().default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(purchaseItemInputSchema).min(1, "At least one item is required in a purchase"),
});

export const updatePurchaseSchema = z.object({
  partyId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).optional(),
  discount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(purchaseItemInputSchema).min(1).optional(),
});

export const purchaseQuerySchema = z.object({
  search: z.string().optional(),
  partyId: z.string().optional(),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitPrice: z.coerce.number().min(0, "Unit price must be zero or positive").optional(),
});

export const invoiceItemSchema = saleItemInputSchema;

export const createSaleSchema = z.object({
  invoiceNo: z.string().trim().max(50).optional(),
  partyId: z.string().min(1, "Party (client) is required"),
  date: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).optional().default("COMPLETED"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional().default(0),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative").optional().default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(saleItemInputSchema).min(1, "At least one item is required in a sale"),
});

export const updateSaleSchema = z.object({
  partyId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).optional(),
  discount: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(saleItemInputSchema).min(1).optional(),
});

export const saleQuerySchema = z.object({
  search: z.string().optional(),
  partyId: z.string().optional(),
  status: z.enum(["DRAFT", "COMPLETED", "CANCELLED"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  category: z.string().trim().min(1, "Category is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateExpenseSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const expenseQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreatePartyInput = z.input<typeof createPartySchema>;
export type UpdatePartyInput = z.input<typeof updatePartySchema>;
export type PartyQueryInput = z.input<typeof partyQuerySchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type ProductQueryInput = z.input<typeof productQuerySchema>;
export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type PurchaseItemInput = z.input<typeof purchaseItemInputSchema>;
export type CreatePurchaseInput = z.input<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.input<typeof updatePurchaseSchema>;
export type PurchaseQueryInput = z.input<typeof purchaseQuerySchema>;
export type SaleItemInput = z.input<typeof saleItemInputSchema>;
export type CreateSaleInput = z.input<typeof createSaleSchema>;
export type UpdateSaleInput = z.input<typeof updateSaleSchema>;
export type SaleQueryInput = z.input<typeof saleQuerySchema>;
export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;
export type ExpenseQueryInput = z.input<typeof expenseQuerySchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
