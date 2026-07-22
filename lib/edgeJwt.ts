/**
 * HS256 verification that runs on the Edge runtime.
 *
 * Middleware cannot use `jsonwebtoken` — it depends on Node's crypto module,
 * which Edge does not provide. Without this the middleware could only check
 * that a `token` cookie *existed*, not that it was valid, which caused a
 * redirect loop: middleware waved a stale cookie through to /Dashboard, the API
 * correctly rejected it, the page bounced to /Auth/login, and middleware sent
 * it straight back to /Dashboard. The user saw "Checking session…" forever.
 *
 * Implemented with Web Crypto so there is no dependency to add and no second
 * signing implementation to keep in step with lib/jwt.ts — both are plain
 * HS256 over the same secret.
 */

const encoder = new TextEncoder();

/** base64url → Uint8Array, tolerating missing padding. */
function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export type EdgeJwtPayload = { userId?: string; driverId?: string; exp?: number; [k: string]: unknown };

/**
 * Verifies signature and expiry. Returns the payload, or null for anything
 * malformed, wrongly signed, or expired.
 *
 * Deliberately returns null rather than throwing — a bad cookie is an ordinary
 * condition here, not an error worth a stack trace on every request.
 */
export async function verifyJwtEdge(
  token: string,
  secret: string,
): Promise<EdgeJwtPayload | null> {
  if (!token || !secret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(headerB64)));
    // Reject "alg": "none" and anything we did not sign with.
    if (header?.alg !== 'HS256') return null;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signatureB64),
      encoder.encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64)),
    ) as EdgeJwtPayload;

    // exp is in seconds since the epoch, as per the JWT spec.
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
