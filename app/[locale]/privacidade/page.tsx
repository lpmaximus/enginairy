import type { Metadata } from "next";
import { alternatesFor } from "@/src/lib/seo";
import type { Locale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Política de privacidade — Enginairy", alternates: alternatesFor("/privacidade", locale) };
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold">Política de privacidade</h1>
      <p className="mt-4" style={{ color: "var(--muted)" }}>
        CONTEÚDO PENDENTE DE REVISÃO JURÍDICA — precisa cobrir tratamento de dados de projeto e LGPD antes de ir ao ar.
      </p>
    </div>
  );
}
