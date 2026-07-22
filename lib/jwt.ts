import jwt from 'jsonwebtoken';

/**
 * Session token signing.
 *
 * The secret is the only thing stopping someone from minting themselves an
 * admin session, so there is deliberately no usable default in production. A
 * hardcoded fallback shipped in the repository is equivalent to no
 * authentication at all — anyone who can read the source can forge a token for
 * any company.
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'JWT_SECRET is not set. Generate one with `openssl rand -base64 48` and set ' +
    'it in the environment before starting the server.',
  );
}

// Development keeps working without configuration, but loudly, and with a
// secret that is obviously not meant for real use.
const SECRET = JWT_SECRET ?? 'insecure-development-only-secret';
if (!JWT_SECRET) {
  console.warn(
    '⚠ JWT_SECRET is not set — using an insecure development secret. ' +
    'Sessions signed now become invalid once a real secret is configured.',
  );
}

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

/** Returns the decoded payload, or null when the token is invalid or expired. */
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
