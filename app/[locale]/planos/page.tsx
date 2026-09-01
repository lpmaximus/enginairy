import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/src/lib/seo";
import { PLAN_PRICE_MONTHLY } from "@/src/lib/pricing";
import {
  FREE_MONTHLY_LIMIT,
  PRO_MONTHLY_LIMIT,
  ESCRITORIO_MONTHLY_LIMIT,
  ENTERPRISE_MONTHLY_LIMIT,
} from "@/src/lib/quota";
import type { Locale } from "@/src/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  return {
    title: `${t("title")} — Enginairy`,
    description: t("subtitle"),
    alternates: alternatesFor("/planos", locale),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  // Limites e preços vêm das MESMAS constantes que o backend aplica. Página de
  // planos que repete números à mão é como o cliente descobre, no suporte, que
  // comprou uma coisa e recebeu outra.
  const plans = [
    { key: "free" as const, price: 0, limit: FREE_MONTHLY_LIMIT },
    { key: "pro" as const, price: PLAN_PRICE_MONTHLY.pro, limit: PRO_MONTHLY_LIMIT },
    { key: "escritorio" as const, price: PLAN_PRICE_MONTHLY.escritorio, limit: ESCRITORIO_MONTHLY_LIMIT },
    { key: "enterprise" as const, price: PLAN_PRICE_MONTHLY.enterprise, limit: ENTERPRISE_MONTHLY_LIMIT },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="mt-2" style={{ color: "var(--muted)" }}>
        {t("subtitle")}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div
            key={p.key}
            className="rounded-lg border p-5"
            style={{ borderColor: "var(--border)", background: "var(--surface2)" }}
          >
            <h2 className="font-semibold">{t(p.key)}</h2>
            <p className="mt-2 text-2xl font-extrabold">
              {p.price === 0
                ? "R$ 0"
                : p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              <span className="text-sm font-normal" style={{ color: "var(--muted)" }}>
                {t("monthly")}
              </span>
            </p>
            <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
              {t("memorialsPerMonth", { count: p.limit })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
