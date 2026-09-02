"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "../adminClient";
import {
  Card,
  Stat,
  BarList,
  Sparkline,
  SplitBar,
  Badge,
  Loading,
  ErrorBox,
  PeriodPicker,
  ago,
  dur,
  num,
} from "../ui";

interface Pair {
  label: string;
  value: number;
  note?: string;
}

interface Payload {
  days: number;
  gaErro: string | null;
  geradoEm: string;
  cache: "hit" | "miss";
  ga: {
    visitantes: number;
    sessoes: number;
    pageviews: number;
    duracaoMedia: number;
    rejeicao: number;
    agoraNoSite: number;
    deltaVisitantes: number | null;
    deltaSessoes: number | null;
    porDia: Pair[];
    novos: number;
    recorrentes: number;
    canais: Pair[];
    origens: Pair[];
    paginas: Pair[];
    dispositivos: Pair[];
    navegadores: Pair[];
    sistemas: Pair[];
    paises: Pair[];
    regioes: Pair[];
    cidades: Pair[];
    ctas: Pair[];
  } | null;
  app: {
    cadastrados: number;
    novosNoPeriodo: number;
    ativosNoPeriodo: number;
    dormentes: number;
    projetosNoPeriodo: number;
    memoriaisNoPeriodo: number;
    eventos: Pair[];
    ativosPorPlano: Pair[];
    maisUsam: Pair[];
    ultimosAcessos: {
      id: number;
      quem: string;
      role: string;
      evento: string;
      projeto: string | null;
      quando: string;
    }[];
  };
}

const CTA_LABEL: Record<string, string> = {
  orcamento_whatsapp: "Orçamento → WhatsApp",
  orcamento_email: "Orçamento → e-mail",
  header_contato: "Botão do topo",
  header_entrar: "Entrar (topo)",
  hero_orcamento: "Hero → orçamento",
  hero_como_funciona: "Hero → como funciona",
  planos_pro: "Plano Pro",
  planos_escritorio: "Plano Escritório",
  planos_enterprise: "Plano Enterprise",
  planos_falar: "Planos → falar com a gente",
  waitlist_submit: "Lista de espera",
  cadastro_iniciado: "Cadastro iniciado",
  footer_whatsapp: "WhatsApp do rodapé",
  projeto_novo: "Novo projeto",
  memorial_download: "Download do memorial",
};

export default function AudienciaPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    adminFetch<Payload>(`/api/admin/audience?days=${days}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [days]);

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Audiência · Google Analytics</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            De onde vêm os visitantes e o que eles olham. Dados em cache por 10 minutos.
          </p>
        </div>
        <PeriodPicker value={days} onChange={setDays} />
      </header>

      {!data ? (
        <Loading what="a audiência" />
      ) : (
        <>
          {data.gaErro && (
            <div
              className="rounded-lg border p-4 text-sm"
              style={{ borderColor: "var(--warn)", color: "var(--warn)" }}
            >
              <strong>Google Analytics não respondeu.</strong>
              <p className="mt-1" style={{ color: "var(--muted)" }}>
                {data.gaErro}
              </p>
              <p className="mt-2" style={{ color: "var(--muted)" }}>
                O bloco “Usuários cadastrados” abaixo vem do banco e continua valendo.
              </p>
            </div>
          )}

          {data.ga && (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Stat
                  label="Visitantes"
                  value={num(data.ga.visitantes)}
                  delta={data.ga.deltaVisitantes}
                />
                <Stat label="Sessões" value={num(data.ga.sessoes)} delta={data.ga.deltaSessoes} />
                <Stat
                  label="Páginas vistas"
                  value={num(data.ga.pageviews)}
                  hint={`${(data.ga.pageviews / (data.ga.sessoes || 1)).toFixed(1)} por sessão`}
                />
                <Stat
                  label="Tempo médio"
                  value={dur(data.ga.duracaoMedia)}
                  hint={`rejeição ${data.ga.rejeicao.toFixed(1)}%`}
                />
                <Stat
                  label="Agora no site"
                  value={num(data.ga.agoraNoSite)}
                  hint="últimos 30 min"
                  tone={data.ga.agoraNoSite > 0 ? "ok" : undefined}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="📈 Visitantes por dia" hint={`Últimos ${days} dias`}>
                  <Sparkline points={data.ga.porDia} />
                </Card>

                <Card
                  title="🔁 Novos × recorrentes"
                  hint="Recorrência indica que o produto prende — foco de retenção"
                >
                  <SplitBar
                    a={{ label: "Novos", value: data.ga.novos }}
                    b={{ label: "Recorrentes", value: data.ga.recorrentes }}
                  />
                </Card>

                <Card title="📊 Origem do tráfego" hint="Onde investir esforço de aquisição">
                  <BarList rows={data.ga.canais} />
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card
                  title="🎯 Cliques em CTA"
                  hint="O evento cta_click, quebrado por botão — é a ponte entre visita e lead"
                >
                  <BarList
                    rows={data.ga.ctas.map((c) => ({
                      ...c,
                      label: CTA_LABEL[c.label] ?? c.label,
                    }))}
                    emptyLabel="Nenhum clique registrado — confira se a dimensão cta_id foi criada no GA4"
                  />
                </Card>

                <Card title="📄 Páginas mais vistas" hint="O que atrai — e o que ninguém abre">
                  <BarList rows={data.ga.paginas} />
                </Card>

                <Card title="🔗 Rede / site de origem" hint="Qual rede ou site mandou a visita">
                  <BarList rows={data.ga.origens} />
                  <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
                    Apps de mensagem escondem a origem: parte do que vem de WhatsApp e Instagram cai
                    em “(direct)”. Para medir com precisão, use links com{" "}
                    <code>?utm_source=instagram</code>.
                  </p>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card title="📱 Dispositivos" hint="Prioridade de otimização de layout">
                  <BarList rows={data.ga.dispositivos} />
                </Card>

                <Card title="🧭 Navegador e sistema" hint="O que testar antes de subir mudança de front">
                  <p
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted2)" }}
                  >
                    Navegador
                  </p>
                  <BarList rows={data.ga.navegadores} />
                  <p
                    className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted2)" }}
                  >
                    Sistema operacional
                  </p>
                  <BarList rows={data.ga.sistemas} />
                </Card>

                <Card title="🌎 Localização" hint="Orienta anúncio geolocalizado e prospecção">
                  <p
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted2)" }}
                  >
                    País
                  </p>
                  <BarList rows={data.ga.paises} />
                  <p
                    className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted2)" }}
                  >
                    Estado / região
                  </p>
                  <BarList rows={data.ga.regioes} />
                  <p
                    className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted2)" }}
                  >
                    Cidade
                  </p>
                  <BarList rows={data.ga.cidades} />
                  <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
                    Precisão até o nível de cidade — o Google infere pelo IP e não devolve endereço.
                  </p>
                </Card>
              </div>
            </>
          )}

          {/* ───────────── Bloco do próprio banco ───────────── */}

          <header className="pt-4">
            <h2 className="text-xl font-extrabold">Usuários cadastrados</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Quem criou conta, quem volta e o que faz dentro do sistema. Dado do próprio banco, não
              do Google.
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Cadastrados"
              value={num(data.app.cadastrados)}
              hint={`+${data.app.novosNoPeriodo} no período`}
            />
            <Stat
              label="Ativos no período"
              value={num(data.app.ativosNoPeriodo)}
              hint={`${
                data.app.cadastrados
                  ? Math.round((data.app.ativosNoPeriodo / data.app.cadastrados) * 100)
                  : 0
              }% da base`}
              tone="ok"
            />
            <Stat
              label="Dormentes"
              value={num(data.app.dormentes)}
              hint="sem sinal há 30+ dias"
              tone={data.app.dormentes > 0 ? "warn" : undefined}
            />
            <Stat label="Projetos criados" value={num(data.app.projetosNoPeriodo)} />
            <Stat label="Memoriais emitidos" value={num(data.app.memoriaisNoPeriodo)} />
          </div>

          <Card
            title="🕘 Últimos acessos"
            hint="Quem entrou e o que fez no período, do mais recente para o mais antigo"
          >
            {data.app.ultimosAcessos.length ? (
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {data.app.ultimosAcessos.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="font-semibold">{a.quem}</span>
                    <Badge>{a.role}</Badge>
                    <span style={{ color: "var(--muted)" }}>{a.evento}</span>
                    {a.projeto && (
                      <span style={{ color: "var(--accent)" }}>· {a.projeto}</span>
                    )}
                    <span className="ml-auto text-xs" style={{ color: "var(--muted2)" }}>
                      {ago(a.quando)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm" style={{ color: "var(--muted2)" }}>
                Nenhuma atividade de conta logada no período.
              </p>
            )}
            <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
              Só conta logada (teto de 80 eventos). Visitante anônimo não entra aqui — o Google
              Analytics devolve totais, nunca acesso a acesso.
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="🧩 O que os cadastrados fazem" hint="Eventos no período — total de vezes">
              <BarList rows={data.app.eventos} emptyLabel="Nenhum evento no período" />
            </Card>

            <Card
              title="💳 Ativos por plano"
              hint="Se o Pro não usa mais que o Free, o plano não está entregando valor"
            >
              <BarList rows={data.app.ativosPorPlano} emptyLabel="Ninguém ativo no período" />
            </Card>

            <Card title="⭐ Quem mais usa" hint="Candidatos naturais a feedback e depoimento">
              <BarList rows={data.app.maisUsam} emptyLabel="Sem uso no período" />
              <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
                Para trocar plano, bloquear ou ver a base inteira, use{" "}
                <Link href="/admin/usuarios" style={{ color: "var(--accent)" }}>
                  Usuários
                </Link>
                .
              </p>
            </Card>
          </div>

          <p className="text-xs" style={{ color: "var(--muted2)" }}>
            Gerado em {new Date(data.geradoEm).toLocaleString("pt-BR")} · cache {data.cache}
          </p>
        </>
      )}
    </div>
  );
}
