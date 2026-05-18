import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export const CUSTOMER_COOKIE = "customer_token";

export interface CustomerJwt {
  customerId: string;
  role: "customer";
  companyId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Read the customer JWT from cookies. Returns null if missing/invalid.
 * Use from server components and route handlers.
 */
export async function getCustomerFromCookie(): Promise<CustomerJwt | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token) as CustomerJwt | null;
  if (!payload || payload.role !== "customer") return null;
  return payload;
}
