import NextAuth from "next-auth";
import { NextResponse, NextRequest } from "next/server";
import type { Session } from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { authConfig } from "./auth.config";
import { routing } from "./src/i18n/routing";
import { LOCALE_COOKIE, localeFromPathname, resolveLocale } from "./src/i18n/geo";
import { getPathname } from "./src/i18n/navigation";

// Instância própria, edge-safe — NÃO usar `auth` de "@/auth" aqui: aquele
// módulo importa src/db (Neon) no topo e quebra no Edge Runtime com
// "No database connection string was provided to neon()".
const { auth } = NextAuth(authConfig);

const intlMiddleware = createIntlMiddleware(routing);

/** Rotas que NÃO passam pelo i18n (seguem só em português). */
function isNonLocalized(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  );
}

/** Rotas que exigem sessão, comparadas SEM o prefixo de idioma. */
const PROTECTED = ["/projetos", "/escritorio", "/conta"];

export default auth((req: NextRequest & { auth: Session | null }) => {
  const { pathname } = req.nextUrl;

  // ── MODO MANUTENÇÃO ────────────────────────────────────────────────────
  const isStaticAsset = /\.(?:png|jpe?g|gif|svg|ico|webp|woff2?|ttf|css|js|map)$/.test(pathname);
  if (
    process.env.MAINTENANCE_MODE === "true" &&
    !pathname.endsWith("/coming-soon") &&
    !isStaticAsset
  ) {
    return NextResponse.redirect(new URL("/coming-soon", req.url));
  }

  if (isNonLocalized(pathname)) return NextResponse.next();

  // ── IDIOMA POR PAÍS ────────────────────────────────────────────────────
  // URL sem prefixo = ainda não sabemos a intenção do visitante. Com prefixo
  // explícito, a URL manda.
  const explicit = localeFromPathname(pathname);
  if (!explicit) {
    const { locale, source } = resolveLocale(req);
    if (locale !== routing.defaultLocale) {
      const url = new URL(req.url);
      url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
      const res = NextResponse.redirect(url);
      if (source !== "cookie") {
        res.cookies.set(LOCALE_COOKIE, locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      }
      // O destino depende de IP/cookie: não pode ficar em cache compartilhado.
      res.headers.set("Cache-Control", "no-store");
      res.headers.set("Vary", "Cookie, Accept-Language, X-Vercel-IP-Country");
      return res;
    }
  }

  // ── ROTAS PROTEGIDAS ───────────────────────────────────────────────────
  const locale = explicit ?? routing.defaultLocale;
  const bare = explicit ? pathname.replace(`/${explicit}`, "") || "/" : pathname;

  if (PROTECTED.some((p) => bare === p || bare.startsWith(`${p}/`)) && !req.auth) {
    const signIn = getPathname({ href: "/entrar", locale });
    const url = new URL(signIn, req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
