import type { Metadata } from "next";
import { alternatesFor } from "@/src/lib/seo";
import type { Locale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { title: "Contato — Enginairy", alternates: alternatesFor("/contato", locale) };
}

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold">Contato</h1>
      <p className="mt-4" style={{ color: "var(--muted)" }}>
        Fale com a equipe: contato@enginairy.com.
      </p>
    </div>
  );
}
