"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "./adminClient";
import { Card, Stat, BarList, Loading, ErrorBox, brl, num } from "./ui";

interface Dashboard {
  periodo: string;
  mrr: number;
  custoMes: number;
  margem: number;
  usuarios: {
    total: number;
    novosNoMes: number;
    bloqueados: number;
    escritorios: number;
    porRole: Record<string, number>;
  };
  projetos: { total: number; emitidos: number };
  memoriais: { total: number; noMes: number };
  jobs: { falhados: number; naFila: number };
  assinaturas: {
    ativasPorPlano: { pro: number; escritorio: number; enterprise: number };
    inadimplentes: number;
  };
  custos: { infra: number; variavel: number };
}

const ROLE_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  escritorio: "Escritório",
  enterprise: "Enterprise",
  admin: "Admin",
};

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<Dashboard>("/api/admin/dashboard")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading what="a visão geral" />;

  const roles = ["free", "pro", "escritorio", "enterprise", "admin"]
    .map((r) => ({ label: ROLE_LABEL[r] ?? r, value: data.usuarios.porRole[r] ?? 0 }))
    .filter((r) => r.value > 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Visão geral · {data.periodo}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Números em tempo real do mês corrente. Clique num card para abrir o módulo.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="MRR" value={brl(data.mrr)} tone="accent" />
        <Stat label="Custo do mês" value={brl(data.custoMes)} tone="warn" />
        <Stat
          label="Margem"
          value={brl(data.margem)}
          tone={data.margem >= 0 ? "ok" : "danger"}
        />
        <Stat
          label="Usuários"
          value={num(data.usuarios.total)}
          hint={`+${data.usuarios.novosNoMes} no mês`}
        />
        <Stat
          label="Memoriais"
          value={num(data.memoriais.total)}
          hint={`${data.memoriais.noMes} no mês`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="👥 Usuários"
          hint="Distribuição da base por plano"
          right={
            <Link href="/admin/usuarios" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              abrir →
            </Link>
          }
        >
          <BarList rows={roles} emptyLabel="Nenhum usuário cadastrado ainda" />
          <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
            {data.usuarios.novosNoMes} novo(s) no mês · {data.usuarios.bloqueados} bloqueado(s) ·{" "}
            {data.usuarios.escritorios} escritório(s)
          </p>
        </Card>

        <Card
          title="📐 Projetos e memoriais"
          hint="O que a base efetivamente produziu"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--muted2)" }}>
                Projetos
              </p>
              <p className="text-2xl font-extrabold">{num(data.projetos.total)}</p>
              <p className="text-xs" style={{ color: "var(--muted2)" }}>
                {data.projetos.emitidos} com memorial emitido
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase" style={{ color: "var(--muted2)" }}>
                Memoriais
              </p>
              <p className="text-2xl font-extrabold">{num(data.memoriais.total)}</p>
              <p className="text-xs" style={{ color: "var(--muted2)" }}>
                {data.memoriais.noMes} emitido(s) no mês
              </p>
            </div>
          </div>
          <p
            className="mt-4 text-xs"
            style={{ color: data.jobs.falhados > 0 ? "var(--danger)" : "var(--muted2)" }}
          >
            {data.jobs.falhados} job(s) falhado(s) · {data.jobs.naFila} na fila
          </p>
        </Card>

        <Card
          title="📈 Consumo"
          hint="Receita contra custo de operação"
          right={
            <Link href="/admin/consumo" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              abrir →
            </Link>
          }
        >
          <BarList
            rows={[
              { label: "Pro", value: data.assinaturas.ativasPorPlano.pro },
              { label: "Escritório", value: data.assinaturas.ativasPorPlano.escritorio },
              { label: "Enterprise", value: data.assinaturas.ativasPorPlano.enterprise },
            ]}
            emptyLabel="Nenhuma assinatura ativa"
          />
          <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
            Infra {brl(data.custos.infra)} · emissão {brl(data.custos.variavel)} ·{" "}
            {data.assinaturas.inadimplentes} inadimplente(s)
          </p>
        </Card>

        <Card
          title="🌐 Audiência"
          hint="Visitas e cliques em CTA, direto do Google Analytics"
          right={
            <Link href="/admin/audiencia" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              abrir →
            </Link>
          }
        >
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            De onde vem o visitante, o que ele abre e qual CTA ele clica antes de virar lead.
          </p>
        </Card>

        <Card
          title="📣 Mensagens"
          hint="Avisos in-app e leads capturados"
          right={
            <Link href="/admin/mensagens" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              abrir →
            </Link>
          }
        >
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Enviar recado para um usuário ou para a base inteira, e ver quem entrou na lista de
            espera.
          </p>
        </Card>
      </div>
    </div>
  );
}
