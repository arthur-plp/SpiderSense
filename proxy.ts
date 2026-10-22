import { type NextRequest, NextResponse } from "next/server";

// Optimistic check only: without a session cookie, protected areas redirect to
// the login page. Real authorization happens in the Data Access Layer.
const SESSION_COOKIE = "spidersense_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/connexion", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/citoyen/:path*", "/heros/:path*", "/admin/:path*"],
};
