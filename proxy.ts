import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwtEdge } from '@/lib/edgeJwt'

/**
 * Route protection.
 *
 * This used to check only that a `token` cookie existed. That is not the same
 * as being signed in, and the difference caused a redirect loop: a stale or
 * forged cookie was waved through to /Dashboard, /api/auth/me correctly
 * rejected it, the dashboard bounced to /Auth/login, and this middleware sent
 * it straight back — leaving the page stuck on "Checking session…".
 *
 * The token is now actually verified, and a cookie that fails is cleared on the
 * way past, so a bad session resolves itself in one redirect instead of looping.
 */

const LOGIN = '/Auth/login'
const HOME = '/Dashboard'

/** Clears the session cookie on whatever response is being returned. */
function clearToken(res: NextResponse) {
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  const { pathname } = req.nextUrl

  const secret = process.env.JWT_SECRET ?? ''
  const session = token ? await verifyJwtEdge(token, secret) : null
  const signedIn = Boolean(session?.userId)

  // A cookie that is present but not valid is dead weight — drop it so the
  // browser stops sending it and the loop cannot restart.
  const staleCookie = Boolean(token) && !signedIn

  if (pathname.startsWith('/Dashboard')) {
    if (!signedIn) {
      const res = NextResponse.redirect(new URL(LOGIN, req.url))
      return staleCookie ? clearToken(res) : res
    }
    return NextResponse.next()
  }

  // Signed-in users skip the landing and auth pages.
  if (pathname === '/' || pathname.startsWith('/Auth')) {
    if (signedIn) return NextResponse.redirect(new URL(HOME, req.url))
    // Not signed in: let them reach the login page, but bin the stale cookie
    // on the way. This is the step that actually breaks the loop.
    return staleCookie ? clearToken(NextResponse.next()) : NextResponse.next()
  }

  return NextResponse.next()
}
