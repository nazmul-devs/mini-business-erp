export type DocumentStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PartyType = "VENDOR" | "CLIENT" | "BOTH";
export type StockMovementType = "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface PartyItem {
  id: string;
  name: string;
  type: PartyType;
  email: string | null;
  phone: string | null;
  address: string | null;
  openingBalance: number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StockMovementItem {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number | string;
  referenceType: string;
  referenceId: string;
  note: string | null;
  createdAt: Date | string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  currentStock: number | string;
  lowStockAt: number | string;
  isActive: boolean;
  isLowStock?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  stockMovements?: StockMovementItem[];
}

export interface PurchaseItemDetail {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export interface PurchaseRecord {
  id: string;
  purchaseNo: string;
  partyId: string;
  party?: {
    id: string;
    name: string;
    type: PartyType;
    email?: string | null;
    phone?: string | null;
  };
  date: Date | string;
  status: DocumentStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  items?: PurchaseItemDetail[];
  _count?: {
    items: number;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
