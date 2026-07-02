import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, decodeJwt } from "jose";

const APP_ROUTES = ["/watch", "/favorites", "/history", "/downloads", "/settings", "/profiles", "/notifications", "/following", "/recommendations"];
const STUDIO_ROUTES = ["/studio"];
const ADMIN_ROUTES = ["/admin"];
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/verify-otp", "/auth/forgot-password", "/auth/reset-password"];

/**
 * Vérifie la signature JWT si JWT_VERIFY_SECRET est configuré (défense en profondeur).
 * Sans secret, décode uniquement le payload (la vraie autorisation reste côté API).
 * Retourne null si le token est invalide ou si la vérification de signature échoue.
 *
 * ⚠️  AVERTISSEMENT SÉCURITÉ :
 * Si JWT_VERIFY_SECRET n'est PAS défini (défaut en dev/prod non configuré), la fonction
 * décode le token SANS vérifier sa signature. Un utilisateur peut forger un cookie JWT
 * avec roles:['ADMIN'] pour passer les gardes de navigation /admin et /studio.
 * La protection réelle est assurée par l'API (guards NestJS) — le proxy est cosmétique.
 *
 * TODO (priorité 5) : Rendre JWT_VERIFY_SECRET obligatoire en production (fail-closed).
 *   if (process.env.NODE_ENV === 'production' && !secret) {
 *     throw new Error('JWT_VERIFY_SECRET doit être défini en production');
 *   }
 */
async function getVerifiedPayload(token: string): Promise<Record<string, unknown> | null> {
  const secret = process.env.JWT_VERIFY_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    // Fail-closed : en production sans secret, refuser plutôt que dégrader silencieusement
    // (sinon un cookie JWT forgé pourrait passer les gardes /admin et /studio).
    return null;
  }
  if (secret) {
    try {
      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, key);
      return payload as Record<string, unknown>;
    } catch {
      // Signature invalide ou token expiré — traiter comme non authentifié
      return null;
    }
  }
  // Fallback : décodage sans vérification (la vraie autorisation est déléguée à l'API)
  try {
    return decodeJwt(token) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getRolesFromPayload(payload: Record<string, unknown>): string[] {
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    return payload.roles as string[];
  }
  if (typeof payload.role === "string") return [payload.role];
  return [];
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isStudio = STUDIO_ROUTES.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_ROUTES.some((p) => pathname.startsWith(p));
  const isApp = APP_ROUTES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  const accessToken = request.cookies.get("ivod-token")?.value;

  // Verify (or decode) the JWT — null means token is absent or cryptographically invalid
  const payload = accessToken ? await getVerifiedPayload(accessToken) : null;
  const isAuthenticated = !!payload;

  if ((isApp || isStudio || isAdmin) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && (isStudio || isAdmin)) {
    const roles = getRolesFromPayload(payload!);
    const isAdminRole = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
    const isCreatorRole = roles.includes("CREATOR");

    if (isAdmin && !isAdminRole) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (isStudio && !isCreatorRole && !isAdminRole) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isAuthenticated && isAuthPage) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//") &&
      !AUTH_ROUTES.some((p) => redirectParam.startsWith(p))
    ) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }

    const roles = getRolesFromPayload(payload!);
    if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (roles.includes("CREATOR")) {
      return NextResponse.redirect(new URL("/studio", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|public).*)"],
};
