/**
 * Schema do Enginairy (Drizzle + Neon Postgres).
 *
 * Espelha a arquitetura de dados validada em backingtrack.store, trocando o
 * domínio (música → projeto de climatização):
 *
 *   songs        → projects   (o projeto HVAC do engenheiro)
 *   stems        → rooms      (os ambientes calculados dentro do projeto)
 *   processing   → processingJobs (mesma máquina de estados assíncrona)
 *   —            → documents  (o memorial gerado, versionado)
 *   bands        → organizations (escritório de projeto: o líder paga, os
 *                  membros herdam o acesso)
 *
 * Regra que atravessa o arquivo: nada de cálculo é gravado sem `normCode` e
 * `engineVersion`. Memorial descritivo é peça de responsabilidade técnica —
 * sem rastreabilidade da norma e da versão do motor, o documento não se
 * sustenta numa revisão futura.
 */
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── Usuários e acesso ─────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    image: text("image"),

    // Credenciais locais (provider = "credentials"); nulo no login Google.
    passwordHash: text("password_hash"),
    provider: varchar("provider", { length: 32 }).default("credentials"),
    providerId: varchar("provider_id", { length: 255 }),

    // free | pro | escritorio | enterprise | admin  (ver src/lib/permissions.ts)
    role: varchar("role", { length: 24 }).notNull().default("free"),
    // active | blocked | banned
    status: varchar("status", { length: 16 }).notNull().default("active"),

    // Dados profissionais — entram no rodapé do memorial e na ART/RRT.
    company: varchar("company", { length: 160 }),
    crea: varchar("crea", { length: 40 }),
    phone: varchar("phone", { length: 32 }),
    cpfCnpj: varchar("cpf_cnpj", { length: 20 }),

    // Trial por convite (pacote fechado de créditos — ver src/lib/trials.ts).
    trialPlan: varchar("trial_plan", { length: 24 }),
    trialPreviousRole: varchar("trial_previous_role", { length: 24 }),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    trialCredits: integer("trial_credits"),

    deletionScheduledAt: timestamp("deletion_scheduled_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),

    // Espelho do Asaas — a verdade do faturamento é do gateway, não nossa.
    provider: varchar("provider", { length: 24 }).notNull().default("asaas"),
    providerCustomerId: varchar("provider_customer_id", { length: 64 }),
    providerSubscriptionId: varchar("provider_subscription_id", { length: 64 }),

    plan: varchar("plan", { length: 24 }).notNull(), // pro | escritorio | enterprise
    // active | trialing | past_due | canceled
    status: varchar("status", { length: 24 }).notNull().default("active"),
    value: numeric("value", { precision: 10, scale: 2 }),

    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("subscriptions_user_idx").on(t.userId),
    providerSubIdx: uniqueIndex("subscriptions_provider_sub_idx").on(t.providerSubscriptionId),
  }),
);

/**
 * Escritório de projeto — o análogo direto de "banda": um assinante paga e os
 * engenheiros vinculados herdam o acesso. É o que permite vender por escritório
 * sem cobrar seat a seat no MVP.
 */
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  // Identidade visual aplicada ao memorial (logo, cabeçalho, cores).
  branding: jsonb("branding"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orgMembers = pgTable(
  "org_members",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("member"), // owner | admin | member
    status: varchar("status", { length: 16 }).notNull().default("active"), // active | invited | removed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("org_members_org_user_idx").on(t.orgId, t.userId),
    userIdx: index("org_members_user_idx").on(t.userId),
  }),
);

/* ─────────────────────────── Domínio: projetos ─────────────────────────── */

/**
 * Um projeto de climatização. `slug` existe para a URL compartilhável e é
 * único por dono, não global — dois escritórios podem ter "torre-a".
 */
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: integer("org_id").references(() => organizations.id, { onDelete: "set null" }),

    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    client: varchar("client", { length: 200 }),
    city: varchar("city", { length: 120 }),
    uf: varchar("uf", { length: 2 }),

    // Tipologia da edificação — muda os coeficientes aplicados pelo ECE.
    buildingType: varchar("building_type", { length: 40 }), // comercial | hospitalar | industrial | residencial
    // Norma selecionada. É gravada no projeto E no cálculo: o projeto pode
    // trocar de norma no meio da revisão, e o memorial antigo continua válido
    // para a norma sob a qual foi emitido.
    normCode: varchar("norm_code", { length: 40 }).notNull().default("ABNT NBR 16401"),

    // Dados climáticos de projeto (TBS/TBU externas, altitude) — snapshot, não
    // referência: se a base climática mudar, o memorial emitido não muda.
    designConditions: jsonb("design_conditions"),

    // draft | calculating | calculated | issued | archived
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("projects_user_idx").on(t.userId),
    orgIdx: index("projects_org_idx").on(t.orgId),
    slugIdx: uniqueIndex("projects_user_slug_idx").on(t.userId, t.slug),
  }),
);

/** Ambiente (zona térmica) dentro de um projeto — a unidade de cálculo. */
export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 160 }).notNull(),
    floor: varchar("floor", { length: 60 }),
    area: numeric("area", { precision: 10, scale: 2 }), // m²
    ceilingHeight: numeric("ceiling_height", { precision: 6, scale: 2 }), // m
    occupancy: integer("occupancy"), // pessoas
    // Cargas internas declaradas (W): iluminação, equipamentos, dissipação.
    internalLoads: jsonb("internal_loads"),
    // Envoltória: paredes, vidros, orientação, sombreamento.
    envelope: jsonb("envelope"),
    // Setpoints: TBS interna, UR, renovação de ar (m³/h·pessoa).
    setpoints: jsonb("setpoints"),

    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("rooms_project_idx").on(t.projectId),
  }),
);

/**
 * Resultado de um cálculo do ECE. Imutável por natureza: recalcular gera uma
 * NOVA linha com `version` incrementado, nunca sobrescreve. É isso que dá a
 * "rastreabilidade" prometida na página — dá para responder "com que número o
 * memorial de março foi emitido" um ano depois.
 */
export const calculations = pgTable(
  "calculations",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    version: integer("version").notNull().default(1),
    normCode: varchar("norm_code", { length: 40 }).notNull(),
    engineVersion: varchar("engine_version", { length: 24 }).notNull(),

    // Entrada congelada (projeto + ambientes no instante do cálculo) e saída.
    inputSnapshot: jsonb("input_snapshot").notNull(),
    results: jsonb("results").notNull(),
    // Avisos e não-conformidades normativas encontradas na validação.
    warnings: jsonb("warnings"),

    totalCoolingLoad: numeric("total_cooling_load", { precision: 12, scale: 2 }), // W
    totalAirflow: numeric("total_airflow", { precision: 12, scale: 2 }), // m³/h

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("calculations_project_idx").on(t.projectId),
    versionIdx: uniqueIndex("calculations_project_version_idx").on(t.projectId, t.version),
  }),
);

/** Memorial emitido (PDF/DOCX) hospedado no R2. Um por cálculo e formato. */
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    calculationId: integer("calculation_id").references(() => calculations.id, {
      onDelete: "set null",
    }),

    kind: varchar("kind", { length: 32 }).notNull().default("memorial"), // memorial | planilha | art
    format: varchar("format", { length: 8 }).notNull(), // pdf | docx
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    bytes: integer("bytes"),
    // SHA-256 do arquivo — permite provar que o PDF em mãos é o que emitimos.
    checksum: varchar("checksum", { length: 64 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("documents_project_idx").on(t.projectId),
  }),
);

/** Catálogo de equipamentos OEM (Daikin, Carrier, Midea) para seleção. */
export const equipment = pgTable(
  "equipment",
  {
    id: serial("id").primaryKey(),
    brand: varchar("brand", { length: 60 }).notNull(),
    line: varchar("line", { length: 120 }),
    model: varchar("model", { length: 120 }).notNull(),
    kind: varchar("kind", { length: 40 }), // split | vrf | chiller | fancoil | rooftop
    capacityBtu: integer("capacity_btu"),
    capacityW: numeric("capacity_w", { precision: 12, scale: 2 }),
    specs: jsonb("specs"),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    brandModelIdx: uniqueIndex("equipment_brand_model_idx").on(t.brand, t.model),
  }),
);

/* ──────────────────── Pipeline assíncrono e observação ─────────────────── */

/**
 * Máquina de estados do processamento pesado (cálculo + emissão do memorial).
 * Mesma forma do backingtrack: a rota cria o job, o provider trabalha fora do
 * request e o webhook fecha o ciclo. `providerJobId` é a chave de idempotência
 * — webhook reentregue não pode gerar dois memoriais.
 */
export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),

    kind: varchar("kind", { length: 32 }).notNull().default("memorial"),
    // queued | running | done | failed
    status: varchar("status", { length: 16 }).notNull().default("queued"),
    provider: varchar("provider", { length: 32 }),
    providerJobId: varchar("provider_job_id", { length: 128 }),

    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("processing_jobs_project_idx").on(t.projectId),
    providerJobIdx: uniqueIndex("processing_jobs_provider_job_idx").on(t.providerJobId),
    statusIdx: index("processing_jobs_status_idx").on(t.status),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    // Caminho interno em português; traduzido na leitura por localizePath.
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
  }),
);

export const userActivity = pgTable(
  "user_activity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 40 }).notNull(),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("user_activity_user_idx").on(t.userId),
    eventIdx: index("user_activity_event_idx").on(t.event),
  }),
);

/**
 * Trilha de auditoria do que muda um projeto emitido. Separada de
 * `user_activity` de propósito: aquilo é analytics de produto e pode ser
 * podado; isto é prova de quem alterou o quê num documento técnico.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 60 }).notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectIdx: index("audit_log_project_idx").on(t.projectId),
  }),
);

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 160 }),
  company: varchar("company", { length: 160 }),
  source: varchar("source", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invites = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }),

    // O convite carrega o pacote: qual plano libera, por quantos dias e com
    // quantos memoriais. Sem isso, "trial" vira negociação caso a caso.
    trialPlan: varchar("trial_plan", { length: 24 }),
    trialDays: integer("trial_days"),
    trialCredits: integer("trial_credits"),

    acceptedBy: integer("accepted_by").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("invites_org_idx").on(t.orgId),
  }),
);
