/**
 * GET /api/admin/audience?days=30 — o painel de Audiência inteiro.
 *
 * Duas fontes, deliberadamente separadas na resposta:
 *
 *   `ga`  — Google Analytics 4. Conta o visitante ANÔNIMO: quantos chegaram,
 *           de onde, o que abriram, qual CTA clicaram. Nunca sabe quem é.
 *   `app` — banco do Enginairy. Conta quem TEM CONTA: último acesso, o que
 *           fez, qual plano. Nunca vê quem não se cadastrou.
 *
 * Misturar as duas num número só ("usuários") é o erro clássico desse painel:
 * as bases não se sobrepõem e a soma não significa nada.
 *
 * Cache de 10 min em memória do processo. A cota da Data API é por
 * propriedade e cada carregamento do painel custa ~12 relatórios; sem cache,
 * abrir a aba três vezes seguidas já rende 429.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, users, userActivity, projects, documents } from "@/src/db";
import { desc, eq, gte, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import { EVENT_LABELS } from "@/src/lib/activity";
import {
  ga4Configured,
  runReport,
  runRealtimeReport,
  toPairs,
  metricTotal,
  delta,
  daysAgo,
  type Ga4Response,
} from "@/src/lib/ga4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<number, { at: number; payload: unknown }>();

/* ─────────────────────────── Bloco do GA4 ─────────────────────────── */

async function gaBlock(days: number) {
  const start = daysAgo(days);
  const end = "today";
  // Período anterior de MESMO tamanho, imediatamente antes — é o que dá
  // sentido ao "▲ x% vs. período anterior".
  const prevStart = daysAgo(days * 2);
  const prevEnd = daysAgo(days + 1);

  const range = [{ startDate: start, endDate: end }];
  const prevRange = [{ startDate: prevStart, endDate: prevEnd }];

  const M = (...names: string[]) => names.map((name) => ({ name }));
  const D = (...names: string[]) => names.map((name) => ({ name }));
  const byMetricDesc = [{ metric: { metricName: "sessions" }, desc: true }];

  const [
    totais,
    totaisAnteriores,
    porDia,
    novosRecorrentes,
    canais,
    origens,
    paginas,
    dispositivos,
    navegadores,
    sistemas,
    paises,
    regioes,
    cidades,
    ctas,
    agora,
  ] = await Promise.all([
    runReport({
      dateRanges: range,
      metrics: M(
        "totalUsers",
        "sessions",
        "screenPageViews",
        "averageSessionDuration",
        "bounceRate",
      ),
    }),
    runReport({ dateRanges: prevRange, metrics: M("totalUsers", "sessions") }),
    runReport({
      dateRanges: range,
      dimensions: D("date"),
      metrics: M("totalUsers"),
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 400,
    }),
    runReport({ dateRanges: range, dimensions: D("newVsReturning"), metrics: M("totalUsers") }),
    runReport({
      dateRanges: range,
      dimensions: D("sessionDefaultChannelGroup"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 12,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("sessionSource"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 12,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("pagePath"),
      metrics: M("screenPageViews"),
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 15,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("deviceCategory"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("browser"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 10,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("operatingSystem"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 10,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("country"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 12,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("region"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 12,
    }),
    runReport({
      dateRanges: range,
      dimensions: D("city"),
      metrics: M("sessions"),
      orderBys: byMetricDesc,
      limit: 12,
    }),
    // Os cliques de CTA. `cta_id` é uma dimensão personalizada de EVENTO — só
    // existe depois de registrada no GA4 (Admin → Definições personalizadas).
    // Enquanto não estiver, este relatório falha e o bloco cai no catch, sem
    // derrubar o resto do painel.
    runReport({
      dateRanges: range,
      dimensions: D("customEvent:cta_id"),
      metrics: M("eventCount"),
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "cta_click" } },
      },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 20,
    }).catch(() => ({ rows: [] }) as Ga4Response),
    runRealtimeReport({ metrics: M("activeUsers") }).catch(() => ({}) as Ga4Response),
  ]);

  const visitantes = metricTotal(totais, 0);
  const sessoes = metricTotal(totais, 1);
  const pageviews = metricTotal(totais, 2);

  const novos = (novosRecorrentes.rows ?? []).find(
    (r) => r.dimensionValues?.[0]?.value === "new",
  );
  const recorrentes = (novosRecorrentes.rows ?? []).find(
    (r) => r.dimensionValues?.[0]?.value === "returning",
  );

  return {
    periodo: { inicio: start, fim: end },
    visitantes,
    sessoes,
    pageviews,
    duracaoMedia: metricTotal(totais, 3),
    rejeicao: metricTotal(totais, 4) * 100,
    agoraNoSite: metricTotal(agora, 0),
    deltaVisitantes: delta(visitantes, metricTotal(totaisAnteriores, 0)),
    deltaSessoes: delta(sessoes, metricTotal(totaisAnteriores, 1)),
    porDia: (porDia.rows ?? []).map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? "";
      return {
        // GA4 devolve YYYYMMDD sem separador.
        label: `${d.slice(6, 8)}/${d.slice(4, 6)}`,
        value: Number(r.metricValues?.[0]?.value ?? 0),
      };
    }),
    novos: Number(novos?.metricValues?.[0]?.value ?? 0),
    recorrentes: Number(recorrentes?.metricValues?.[0]?.value ?? 0),
    canais: toPairs(canais),
    origens: toPairs(origens),
    paginas: toPairs(paginas),
    dispositivos: toPairs(dispositivos),
    navegadores: toPairs(navegadores),
    sistemas: toPairs(sistemas),
    paises: toPairs(paises),
    regioes: toPairs(regioes),
    cidades: toPairs(cidades),
    ctas: toPairs(ctas),
  };
}

/* ─────────────────────── Bloco do próprio banco ───────────────────── */

async function appBlock(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const dormenteAntes = new Date(Date.now() - 30 * 86_400_000);
  const count = sql<number>`count(*)::int`;

  const [
    [cadastrados],
    [novos],
    [ativos],
    [dormentes],
    eventos,
    ultimosAcessos,
    ativosPorPlano,
    maisUsam,
    [projetosNoPeriodo],
    [memoriaisNoPeriodo],
  ] = await Promise.all([
    db.select({ n: count }).from(users),
    db.select({ n: count }).from(users).where(gte(users.createdAt, since)),
    db.select({ n: count }).from(users).where(gte(users.lastSeenAt, since)),
    db
      .select({ n: count })
      .from(users)
      .where(sql`${users.lastSeenAt} is null or ${users.lastSeenAt} < ${dormenteAntes}`),

    db
      .select({ event: userActivity.event, n: count })
      .from(userActivity)
      .where(gte(userActivity.createdAt, since))
      .groupBy(userActivity.event)
      .orderBy(desc(count)),

    // Feed do "Últimos acessos". Teto de 80 porque a lista é para leitura
    // humana; passar disso é relatório, não painel.
    db
      .select({
        id: userActivity.id,
        event: userActivity.event,
        createdAt: userActivity.createdAt,
        userName: users.name,
        userEmail: users.email,
        role: users.role,
        projectName: projects.name,
      })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .leftJoin(projects, eq(projects.id, userActivity.projectId))
      .where(gte(userActivity.createdAt, since))
      .orderBy(desc(userActivity.createdAt))
      .limit(80),

    db
      .select({ role: users.role, n: count })
      .from(users)
      .where(gte(users.lastSeenAt, since))
      .groupBy(users.role),

    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        n: count,
      })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(gte(userActivity.createdAt, since))
      .groupBy(users.id, users.name, users.email, users.role)
      .orderBy(desc(count))
      .limit(10),

    db.select({ n: count }).from(projects).where(gte(projects.createdAt, since)),
    db.select({ n: count }).from(documents).where(gte(documents.createdAt, since)),
  ]);

  return {
    cadastrados: cadastrados?.n ?? 0,
    novosNoPeriodo: novos?.n ?? 0,
    ativosNoPeriodo: ativos?.n ?? 0,
    dormentes: dormentes?.n ?? 0,
    projetosNoPeriodo: projetosNoPeriodo?.n ?? 0,
    memoriaisNoPeriodo: memoriaisNoPeriodo?.n ?? 0,
    eventos: eventos.map((e) => ({
      label: EVENT_LABELS[e.event as keyof typeof EVENT_LABELS] ?? e.event,
      value: e.n,
    })),
    ativosPorPlano: ativosPorPlano.map((r) => ({ label: r.role, value: r.n })),
    maisUsam: maisUsam.map((u) => ({
      label: u.name ?? u.email,
      value: u.n,
      note: u.role,
    })),
    ultimosAcessos: ultimosAcessos.map((a) => ({
      id: a.id,
      quem: a.userName ?? a.userEmail,
      role: a.role,
      evento: EVENT_LABELS[a.event as keyof typeof EVENT_LABELS] ?? a.event,
      projeto: a.projectName,
      quando: a.createdAt,
    })),
  };
}

/* ──────────────────────────────── Rota ─────────────────────────────── */

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 365);

  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return NextResponse.json({ ...(hit.payload as object), cache: "hit" });
  }

  const app = await appBlock(days);

  // O GA4 é a parte que pode faltar (sem credencial) ou cair (cota, rede).
  // Nesses casos o painel ainda tem que abrir com os dados do banco — daí o
  // bloco `ga` ser nulo em vez de a rota devolver 500.
  let ga: Awaited<ReturnType<typeof gaBlock>> | null = null;
  let gaErro: string | null = null;

  if (!ga4Configured()) {
    gaErro =
      "GA4 não configurado. Defina GA4_PROPERTY_ID, GA4_OAUTH_CLIENT_ID, GA4_OAUTH_CLIENT_SECRET e GA4_OAUTH_REFRESH_TOKEN — ver docs/ga4-setup.md.";
  } else {
    try {
      ga = await gaBlock(days);
    } catch (err) {
      gaErro = err instanceof Error ? err.message : "Falha ao consultar o GA4";
      console.error("[audience] GA4 falhou", err);
    }
  }

  const payload = { days, ga, gaErro, app, geradoEm: new Date().toISOString() };
  cache.set(days, { at: Date.now(), payload });
  return NextResponse.json({ ...payload, cache: "miss" });
}
