import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import { htmlLang, type Locale } from "@/src/i18n/routing";

export const metadata: Metadata = {
  icons: { icon: "/enginairy-icon.png", apple: "/enginairy-icon.png" },
  title: "Enginairy — automação de projetos de climatização",
  description:
    "Dados técnicos entram, memorial descritivo sai. Cálculo de carga térmica com validação normativa ABNT NBR 16401 e rastreabilidade de revisões.",
};

/**
 * Root layout único da aplicação (vale para /admin também).
 * O idioma vem do request — em /admin, que não é localizado, cai no padrão.
 * O provider de mensagens fica em app/[locale]/layout.tsx.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;

  return (
    <html lang={htmlLang[locale] ?? "pt-BR"} className="h-full">
      <body
        className="min-h-full flex flex-col"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
