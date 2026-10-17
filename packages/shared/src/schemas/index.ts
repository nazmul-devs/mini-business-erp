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
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
