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

function decode(token: string | undefined | null): CustomerJwt | null {
  if (!token) return null;
  const payload = verifyToken(token) as CustomerJwt | null;
  if (!payload || payload.role !== "customer") return null;
  return payload;
}

/**
 * Read the customer JWT from cookies. Returns null if missing/invalid.
 * Use from server components and route handlers.
 */
export async function getCustomerFromCookie(): Promise<CustomerJwt | null> {
  const store = await cookies();
  return decode(store.get(CUSTOMER_COOKIE)?.value);
}

/**
 * Cookie OR `Authorization: Bearer`.
 *
 * The website signs in with the httpOnly cookie. A React Native app cannot rely
 * on a cookie jar surviving restarts, so the mobile app sends the same JWT as a
 * Bearer header and keeps it in the device keystore instead. The payload is
 * identical either way, so nothing downstream changes — this only widens where
 * the token is read from.
 *
 * Prefer this over getCustomerFromCookie in any route the mobile app calls.
 */
export async function getCustomer(req?: Request): Promise<CustomerJwt | null> {
  const bearer = req?.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const fromHeader = decode(bearer);
  if (fromHeader) return fromHeader;

  try {
    return await getCustomerFromCookie();
  } catch {
    // cookies() throws outside a request scope — treat that as signed out.
    return null;
  }
}
