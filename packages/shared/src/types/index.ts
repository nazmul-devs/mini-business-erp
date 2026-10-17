export type DocumentStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PartyType = "VENDOR" | "CLIENT" | "BOTH";

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
