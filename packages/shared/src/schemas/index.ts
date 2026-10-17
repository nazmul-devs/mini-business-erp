import { z } from "zod";

export const partySchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["VENDOR", "CLIENT", "BOTH"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
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
