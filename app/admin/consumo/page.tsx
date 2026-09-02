"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../adminClient";
import {
  Card,
  Stat,
  BarList,
  Sparkline,
  Loading,
  ErrorBox,
  PeriodPicker,
  brl,
  num,
} from "../ui";

interface Payload {
  days: number;
  mrr: number;
  receitaPorPlano: Record<string, number>;
  assinaturas: {
    ativasPorPlano: { pro: number; escritorio: number; enterprise: number };
    porStatus: Record<string, number>;
  };
  custos: {
    infra: number;
    detalheInfra: Record<string, number>;
    emissao: number;
    total: number;
    porMemorial: number;
  };
  margem: number;
  emissoes: {
    total: number;
    porFormato: Record<string, number>;
    porDia: { dia: string; n: number }[];
  };
  jobs: { porStatus: Record<string, number>; total: number; taxaFalha: number };
  topUsuarios: { id: number; name: string | null; email: string; role: string; n: number }[];
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em trial",
  past_due: "Inadimplente",
  canceled: "Cancelada",
};

const JOB_LABEL: Record<string, string> = {
  queued: "Na fila",
  running: "Rodando",
  done: "Concluído",
  failed: "Falhou",
};

export default function ConsumoPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    adminFetch<Payload>(`/api/admin/consumption?days=${days}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [days]);

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Consumo</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Quanto entra, quanto custa entregar e quem está gastando o motor.
          </p>
        </div>
        <PeriodPicker value={days} onChange={setDays} options={[7, 30, 90, 365]} />
      </header>

      {!data ? (
        <Loading what="o consumo" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="MRR" value={brl(data.mrr)} tone="accent" />
            <Stat
              label="Custo no período"
              value={brl(data.custos.total)}
              hint={`infra ${brl(data.custos.infra)} + emissão ${brl(data.custos.emissao)}`}
              tone="warn"
            />
            <Stat
              label="Margem"
              value={brl(data.margem)}
              tone={data.margem >= 0 ? "ok" : "danger"}
            />
            <Stat
              label="Memoriais emitidos"
              value={num(data.emissoes.total)}
              hint={`${brl(data.custos.porMemorial)} por emissão`}
            />
          </div>

          <Card title="📄 Emissões por dia" hint="Onde o motor foi realmente usado no período">
            <Sparkline
              points={data.emissoes.porDia.map((d) => ({
                label: d.dia.slice(5),
                value: d.n,
              }))}
            />
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="💳 Receita por plano" hint="Mensal recorrente, por tier">
              <BarList
                rows={[
                  { label: "Pro", value: data.receitaPorPlano.pro ?? 0 },
                  { label: "Escritório", value: data.receitaPorPlano.escritorio ?? 0 },
                  { label: "Enterprise", value: data.receitaPorPlano.enterprise ?? 0 },
                ]}
                format={brl}
                emptyLabel="Nenhuma assinatura ativa"
              />
              <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
                Assinaturas ativas: {data.assinaturas.ativasPorPlano.pro} Pro ·{" "}
                {data.assinaturas.ativasPorPlano.escritorio} Escritório ·{" "}
                {data.assinaturas.ativasPorPlano.enterprise} Enterprise
              </p>
            </Card>

            <Card title="🧾 Situação das assinaturas" hint="Inadimplência antes de virar churn">
              <BarList
                rows={Object.entries(data.assinaturas.porStatus).map(([k, v]) => ({
                  label: STATUS_LABEL[k] ?? k,
                  value: v,
                }))}
                emptyLabel="Nenhuma assinatura registrada"
              />
            </Card>

            <Card title="🏗️ Custo de infra" hint="Estimativa fixa — ajustar conforme a fatura real">
              <BarList
                rows={Object.entries(data.custos.detalheInfra).map(([k, v]) => ({
                  label: k,
                  value: v,
                }))}
                format={brl}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card
              title="⚙️ Jobs de processamento"
              hint="Falha custa runtime e não entrega documento"
            >
              <BarList
                rows={Object.entries(data.jobs.porStatus).map(([k, v]) => ({
                  label: JOB_LABEL[k] ?? k,
                  value: v,
                }))}
                emptyLabel="Nenhum job no período"
              />
              <p
                className="mt-4 text-xs font-semibold"
                style={{ color: data.jobs.taxaFalha > 5 ? "var(--danger)" : "var(--muted2)" }}
              >
                Taxa de falha: {data.jobs.taxaFalha.toFixed(1)}% de {num(data.jobs.total)} job(s)
              </p>
            </Card>

            <Card title="📎 Formato entregue" hint="DOCX é capability paga — se o Free baixa, tem furo">
              <BarList
                rows={Object.entries(data.emissoes.porFormato).map(([k, v]) => ({
                  label: k.toUpperCase(),
                  value: v,
                }))}
                emptyLabel="Nenhum documento no período"
              />
            </Card>

            <Card title="🏆 Quem mais emite" hint="Candidatos a depoimento — e a upgrade">
              <BarList
                rows={data.topUsuarios.map((u) => ({
                  label: u.name ?? u.email,
                  value: u.n,
                  note: u.role,
                }))}
                emptyLabel="Ninguém emitiu no período"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
