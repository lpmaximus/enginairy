import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/src/i18n/routing";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

// ⚠️ NÃO declarar `alternates` aqui — o App Router herda o campo para toda
// página que não o sobrescreve, e um canonical da home vazaria para o site
// inteiro. Cada página pública declara o seu com alternatesFor(). Ver src/lib/seo.ts.

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <NextIntlClientProvider>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </NextIntlClientProvider>
  );
}
