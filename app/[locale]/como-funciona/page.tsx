import type { Metadata } from "next";
import { alternatesFor } from "@/src/lib/seo";
import type { Locale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Como funciona — Enginairy",
    description:
      "Do cadastro dos ambientes ao memorial assinado: as quatro etapas do fluxo Enginairy.",
    alternates: alternatesFor("/como-funciona", locale),
  };
}

const STEPS = [
  {
    n: "1",
    title: "Cadastre o projeto e os ambientes",
    body: "Área, pé-direito, ocupação, cargas internas e envoltória de cada zona térmica.",
  },
  {
    n: "2",
    title: "O ECE calcula e valida",
    body: "As equações e coeficientes da norma selecionada rodam sobre os dados, e a validação aponta o que está fora da faixa antes de você emitir.",
  },
  {
    n: "3",
    title: "Revise a memória de cálculo",
    body: "Cada parcela de ganho aparece aberta por origem. Recalcular gera uma nova revisão — a anterior continua consultável.",
  },
  {
    n: "4",
    title: "Emita o memorial",
    body: "PDF para protocolo e DOCX editável, com premissas, limitações e responsável técnico no rodapé.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold">Como funciona</h1>
      <ol className="mt-10 flex flex-col gap-6">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-4">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {s.n}
            </span>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
