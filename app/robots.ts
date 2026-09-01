import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/siteUrl";

// Next.js gera /robots.txt a partir deste arquivo (App Router).
// Em manutenção (MAINTENANCE_MODE=true o proxy manda tudo para /coming-soon)
// não faz sentido convidar o robô: disallow total para não indexar a espera.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  if (process.env.MAINTENANCE_MODE === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  // Rotas sem valor de busca ou que exigem sessão — nas duas línguas
  // (os slugs em inglês são outros: ver src/i18n/routing.ts).
  const privatePaths = [
    "/api/",
    "/admin/",
    "/coming-soon",
    "/en/coming-soon",
    // pt
    "/projetos",
    "/escritorio",
    "/conta",
    "/entrar",
    "/convite",
    // en
    "/en/projects",
    "/en/workspace",
    "/en/account",
    "/en/sign-in",
    "/en/invite",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: privatePaths }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
