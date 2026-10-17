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

export const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

export const createSaleSchema = z.object({
  partyId: z.string().min(1),
  date: z.coerce.date().optional(),
  discount: z.number().nonnegative().default(0),
  items: z.array(invoiceItemSchema).min(1),
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

export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type UpdatePartyInput = z.infer<typeof updatePartySchema>;
export type PartyQueryInput = z.infer<typeof partyQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
