import type { Metadata } from "next";
import { alternatesFor } from "@/src/lib/seo";
import type { Locale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Sobre — Enginairy", alternates: alternatesFor("/sobre", locale) };
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold">Sobre</h1>
      <p className="mt-4" style={{ color: "var(--muted)" }}>
        Enginairy é um produto L2tech para automação de projetos de climatização.
      </p>
    </div>
  );
}
