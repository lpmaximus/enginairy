import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/siteUrl";
import { routing, htmlLang, type Locale } from "@/src/i18n/routing";
import { getPathname } from "@/src/i18n/navigation";

// Regerado a cada 1h. Só páginas públicas: projeto de cliente não entra em
// sitemap, e as rotas logadas já estão bloqueadas no robots.ts.
export const revalidate = 3600;

const STATIC_ROUTES: {
  href: Parameters<typeof getPathname>[0]["href"];
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { href: "/",              priority: 1.0, changeFrequency: "weekly" },
  { href: "/planos",        priority: 0.9, changeFrequency: "monthly" },
  { href: "/como-funciona", priority: 0.8, changeFrequency: "monthly" },
  { href: "/sobre",         priority: 0.4, changeFrequency: "yearly" },
  { href: "/contato",       priority: 0.4, changeFrequency: "yearly" },
  { href: "/termos",        priority: 0.2, changeFrequency: "yearly" },
  { href: "/privacidade",   priority: 0.2, changeFrequency: "yearly" },
  { href: "/cookies",       priority: 0.2, changeFrequency: "yearly" },
];

/** hreflang no sitemap: evita o Google tratar /en/pricing como cópia de /planos. */
function alternates(href: Parameters<typeof getPathname>[0]["href"], base: string) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[htmlLang[l]] = `${base}${getPathname({ href, locale: l })}`;
  }
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  return STATIC_ROUTES.flatMap(({ href, priority, changeFrequency }) =>
    routing.locales.map((locale: Locale) => ({
      url: `${base}${getPathname({ href, locale })}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: alternates(href, base),
    })),
  );
}
