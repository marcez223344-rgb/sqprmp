import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { buildCsp, generateNonce } from "@/lib/security/csp";

/** Paths that require a session (optimistic check; pages re-verify with getUser()). */
const PROTECTED_PREFIXES = [
  "/aprender",
  "/ruta",
  "/ejercicio",
  "/leccion",
  "/perfil",
  "/onboarding",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const { response, isAuthenticated } = await updateSession(request, requestHeaders);
  const { pathname } = request.nextUrl;

  if (!isAuthenticated && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, images, datasets and public brand files.
    "/((?!_next/static|_next/image|favicon.ico|brand/|datasets/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
