import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// The app's own routes. Signed-out visitors to these go to /login. Anything else (an address
// that doesn't exist) falls through to the designed 404 with a real 404 status, instead of
// being bounced to the login page as a 200. Server components re-check auth regardless.
const PROTECTED_PREFIXES = ["/speaking", "/analysis", "/settings", "/import", "/api"];

function isProtected(pathname: string): boolean {
  if (pathname === "/") return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase auth session on every request and gates the app's routes.
 * Unauthenticated users hitting a protected route are redirected to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If env is not configured yet, don't crash — just pass through.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getClaims() verifies the session JWT. With asymmetric signing keys it does so locally
  // (cached JWKS), avoiding a round trip to the Auth server on every page turn; with a
  // symmetric secret it falls back to asking the server, exactly like getUser().
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  if (!signedIn && isProtected(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
