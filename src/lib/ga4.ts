/**
 * Cliente do Google Analytics 4 Data API — REST puro, sem SDK.
 *
 * Por que sem @google-analytics/data: o pacote arrasta gRPC e ~40 MB de
 * dependência para dentro do bundle serverless. O que precisamos é trocar um
 * refresh token por um access token e fazer POSTs.
 *
 * Por que OAuth (usuário) em vez de conta de serviço: o Google Cloud, desde
 * 2026, aplica por padrão uma política de organização que bloqueia a criação
 * de chaves de conta de serviço em projetos novos/pessoais
 * (iam.disableServiceAccountKeyCreation), e a conta usada aqui não tem
 * permissão para desativar essa política. A alternativa sem esse bloqueio é
 * autenticar como o próprio usuário dono da propriedade GA4 (l2techs.ia@
 * gmail.com), via um cliente OAuth "Aplicativo da Web" com um refresh token
 * de longa duração — obtido uma única vez (fora deste código, via OAuth
 * Playground) com o escopo analytics.readonly e reutilizado indefinidamente
 * pelo servidor. Como não há SDK, o refresh flow é dois campos de formulário
 * e um fetch.
 *
 * Importante: o app OAuth (Google Auth Platform, projeto GCP) precisa estar
 * com status de publicação "Em produção", não "Testando" — nesse último modo
 * o Google expira o refresh token em 7 dias. Em produção, sem verificação,
 * segue funcionando indefinidamente com o próprio dono da propriedade como
 * usuário (o aviso "app não verificado" na tela de consentimento só aparece
 * na hora de gerar o token, não afeta o uso do token depois).
 *
 * Requer runtime Node (nada aqui é edge-incompatível, mas mantemos a mesma
 * exigência do cliente anterior por consistência). Toda rota que importar
 * este módulo precisa declarar `export const runtime = "nodejs"`.
 *
 * Credenciais:
 *   GA4_PROPERTY_ID        — só o número, sem o prefixo "properties/"
 *   GA4_OAUTH_CLIENT_ID    — ...apps.googleusercontent.com
 *   GA4_OAUTH_CLIENT_SECRET
 *   GA4_OAUTH_REFRESH_TOKEN
 *
 * Sem as quatro, `ga4Configured()` devolve false e o painel mostra o passo a
 * passo de configuração em vez de quebrar.
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DATA_URL = "https://analyticsdata.googleapis.com/v1beta";

export function ga4Configured(): boolean {
  return Boolean(
    process.env.GA4_PROPERTY_ID &&
      process.env.GA4_OAUTH_CLIENT_ID &&
      process.env.GA4_OAUTH_CLIENT_SECRET &&
      process.env.GA4_OAUTH_REFRESH_TOKEN,
  );
}

/* ─────────────────────────────── Token ─────────────────────────────── */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  // 60 s de folga: token que expira no voo vira 401 intermitente.
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GA4_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GA4_OAUTH_CLIENT_SECRET ?? "",
      refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`GA4 token ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

/* ───────────────────────────── Relatórios ──────────────────────────── */

export interface Ga4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

export interface Ga4Response {
  rows?: Ga4Row[];
  rowCount?: number;
  totals?: Ga4Row[];
}

type ReportRequest = {
  dateRanges?: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  limit?: number;
  orderBys?: unknown[];
  dimensionFilter?: unknown;
  keepEmptyRows?: boolean;
  minuteRanges?: { startMinutesAgo: number; endMinutesAgo: number }[];
};

async function callReport(endpoint: string, body: ReportRequest): Promise<Ga4Response> {
  const token = await accessToken();
  const res = await fetch(`${DATA_URL}/properties/${process.env.GA4_PROPERTY_ID}:${endpoint}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`GA4 ${endpoint} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()) as Ga4Response;
}

export function runReport(body: ReportRequest): Promise<Ga4Response> {
  return callReport("runReport", body);
}

export function runRealtimeReport(body: ReportRequest): Promise<Ga4Response> {
  return callReport("runRealtimeReport", body);
}

/* ─────────────────────────────── Helpers ───────────────────────────── */

/** Primeira dimensão + primeira métrica → [{ label, value }] ordenado. */
export function toPairs(res: Ga4Response): { label: string; value: number }[] {
  return (res.rows ?? []).map((r) => ({
    label: r.dimensionValues?.[0]?.value ?? "(não definido)",
    value: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

/**
 * Valor de uma métrica num relatório SEM dimensões.
 *
 * Lê `rows[0]` antes de `totals`: a Data API só devolve `totals` quando o
 * pedido traz `metricAggregations`, e um relatório sem dimensões já vem com a
 * linha única agregada. Confiar só em `totals` é como esse painel devolve zero
 * em tudo sem dar erro nenhum.
 */
export function metricTotal(res: Ga4Response, index = 0): number {
  const fromRow = res.rows?.[0]?.metricValues?.[index]?.value;
  if (fromRow !== undefined) return Number(fromRow);
  return Number(res.totals?.[0]?.metricValues?.[index]?.value ?? 0);
}

/** Variação percentual; null quando não há base de comparação. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

/** YYYY-MM-DD de N dias atrás (fuso do relatório é o da propriedade GA4). */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
