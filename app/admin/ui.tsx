"use client";

/**
 * Primitivas visuais do painel. Existem para que os cinco módulos tenham a
 * mesma linguagem sem cada um reinventar card, barra e estado de carregamento
 * — foi assim que o admin do backingtrack virou cinco dialetos diferentes.
 *
 * Tudo usa as variáveis de tema de globals.css: o painel acompanha o modo
 * claro/escuro do sistema sem uma linha de JS.
 */

import type { ReactNode } from "react";

/* ──────────────────────────── Formatação ──────────────────────────── */

export function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v: number): string {
  return v.toLocaleString("pt-BR");
}

/** Duração em segundos → "56s" / "4m 12s". */
export function dur(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** "há 3 d" / "há 5 h" / "agora". Data nula vira travessão. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/* ────────────────────────────── Blocos ────────────────────────────── */

export function Card({
  title,
  hint,
  children,
  right,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      {(title || right) && (
        <header className="mb-1 flex items-start justify-between gap-3">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {right}
        </header>
      )}
      {hint && (
        <p className="mb-4 text-xs" style={{ color: "var(--muted2)" }}>
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

/** Card de número grande. `delta` em % — verde sobe, vermelho desce. */
export function Stat({
  label,
  value,
  hint,
  delta,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  tone?: "accent" | "ok" | "warn" | "danger";
}) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "danger"
          ? "var(--danger)"
          : "var(--text)";

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface2)" }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--muted2)" }}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color }}>
        {value}
      </p>
      {typeof delta === "number" && (
        <p
          className="mt-1 text-xs font-semibold"
          style={{ color: delta >= 0 ? "var(--ok)" : "var(--danger)" }}
        >
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs. período anterior
        </p>
      )}
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--muted2)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Lista com barra proporcional. A barra é normalizada pelo maior valor da
 * própria lista, não por um total: o que interessa nesses painéis é a ordem de
 * grandeza entre as linhas, e normalizar pelo total achata tudo quando há uma
 * cauda longa.
 */
export function BarList({
  rows,
  format = num,
  emptyLabel = "Sem dados no período",
  max: fixedMax,
}: {
  rows: { label: string; value: number; note?: string; dim?: boolean }[];
  format?: (v: number) => string;
  emptyLabel?: string;
  max?: number;
}) {
  if (!rows.length) {
    return (
      <p className="py-4 text-sm" style={{ color: "var(--muted2)" }}>
        {emptyLabel}
      </p>
    );
  }
  const max = fixedMax ?? Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`} className="flex items-center gap-3 text-sm">
          <span
            className="min-w-0 flex-1 truncate"
            title={r.label}
            style={{ color: r.dim ? "var(--muted2)" : "var(--text)" }}
          >
            {r.label}
          </span>
          {r.note && (
            <span className="shrink-0 text-xs" style={{ color: "var(--muted2)" }}>
              {r.note}
            </span>
          )}
          <span
            className="h-2 w-24 shrink-0 overflow-hidden rounded-full sm:w-32"
            style={{ background: "var(--surface3)" }}
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max((r.value / max) * 100, 3)}%`,
                background: "var(--accent)",
              }}
            />
          </span>
          <span className="w-14 shrink-0 text-right font-semibold tabular-nums">
            {format(r.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Série temporal em área. SVG puro — nenhuma lib de gráfico no bundle. */
export function Sparkline({
  points,
  height = 120,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-sm" style={{ color: "var(--muted2)" }}>
        Sem série no período
      </p>
    );
  }

  const w = 600;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = w / (points.length - 1);
  const y = (v: number) => height - (v / max) * (height - 8) - 4;
  const line = points.map((p, i) => `${i * step},${y(p.value)}`).join(" ");
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Série de ${points.length} pontos, pico de ${peak.value}`}
      >
        <polygon
          points={`0,${height} ${line} ${w},${height}`}
          fill="var(--accent)"
          opacity="0.12"
        />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[11px]" style={{ color: "var(--muted2)" }}>
        <span>{points[0]?.label}</span>
        <span>
          pico: {num(peak.value)} em {peak.label}
        </span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Barra única dividida em duas partes (novos × recorrentes). */
export function SplitBar({
  a,
  b,
}: {
  a: { label: string; value: number };
  b: { label: string; value: number };
}) {
  const total = a.value + b.value || 1;
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full"
        style={{ background: "var(--surface3)" }}
      >
        <span style={{ width: `${(a.value / total) * 100}%`, background: "var(--accent)" }} />
        <span style={{ width: `${(b.value / total) * 100}%`, background: "var(--accent2)" }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          {a.label}: <strong>{num(a.value)}</strong> ({pct(a.value)}%)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--accent2)" }}
          />
          {b.label}: <strong>{num(b.value)}</strong> ({pct(b.value)}%)
        </span>
      </div>
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone?: "ok" | "warn" | "danger" }) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "danger"
          ? "var(--danger)"
          : "var(--muted)";
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color, background: "var(--surface3)" }}
    >
      {children}
    </span>
  );
}

export function Loading({ what = "dados" }: { what?: string }) {
  return (
    <p className="py-12 text-sm" style={{ color: "var(--muted)" }}>
      Carregando {what}…
    </p>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border p-4 text-sm"
      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
    >
      {message}
    </div>
  );
}

export function PeriodPicker({
  value,
  onChange,
  options = [1, 7, 30, 90],
}: {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}) {
  return (
    <div className="flex gap-1">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className="rounded-md px-3 py-1.5 text-sm font-semibold"
          style={
            d === value
              ? { background: "var(--accent)", color: "#fff" }
              : { background: "var(--surface2)", color: "var(--muted)" }
          }
        >
          {d === 1 ? "1 dia" : `${d} dias`}
        </button>
      ))}
    </div>
  );
}
