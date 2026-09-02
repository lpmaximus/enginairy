"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, adminPatch } from "../adminClient";
import { Card, Stat, Badge, Loading, ErrorBox, ago, shortDate, num } from "../ui";

interface Row {
  id: number;
  name: string | null;
  email: string;
  role: string;
  status: string;
  company: string | null;
  crea: string | null;
  trialPlan: string | null;
  trialEndsAt: string | null;
  trialCredits: number | null;
  deletionScheduledAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  projetos: number;
  memoriais: number;
  escritorios: number;
}

interface Payload {
  rows: Row[];
  total: number;
  limit: number;
  offset: number;
  resumo: {
    porRole: Record<string, number>;
    porStatus: Record<string, number>;
    assinantes: number;
  };
}

const ROLES = ["free", "pro", "escritorio", "enterprise", "admin"] as const;
const ROLE_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  escritorio: "Escritório",
  enterprise: "Enterprise",
  admin: "Admin",
};

export default function UsuariosPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (roleFilter) params.set("role", roleFilter);
    adminFetch<Payload>(`/api/admin/users?${params}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q, roleFilter]);

  // Debounce na busca: cada tecla é uma query com ILIKE em cima da base
  // inteira — sem isso, digitar um e-mail dispara 20 varreduras.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function change(id: number, patch: { role?: string; status?: string }) {
    setBusy(id);
    setError(null);
    try {
      await adminPatch("/api/admin/users", { id, ...patch });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <ErrorBox message={error} />;
  if (!data) return <Loading what="a base de usuários" />;

  const { resumo } = data;
  const bloqueados = (resumo.porStatus.blocked ?? 0) + (resumo.porStatus.banned ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Usuários</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          A base inteira. Trocar plano e bloquear conta valem na hora — o usuário sente na próxima
          requisição, sem precisar sair e entrar.
        </p>
      </header>

      {error && <ErrorBox message={error} />}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Cadastrados" value={num(data.total)} />
        <Stat label="Assinantes ativos" value={num(resumo.assinantes)} tone="ok" />
        <Stat label="Free" value={num(resumo.porRole.free ?? 0)} />
        <Stat
          label="Bloqueados"
          value={num(bloqueados)}
          tone={bloqueados > 0 ? "danger" : undefined}
        />
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
          >
            <option value="">Todos os planos</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr
                className="text-left text-[11px] uppercase tracking-wider"
                style={{ color: "var(--muted2)" }}
              >
                <th className="pb-2">Usuário</th>
                <th className="pb-2">Plano</th>
                <th className="pb-2 text-right">Projetos</th>
                <th className="pb-2 text-right">Memoriais</th>
                <th className="pb-2 text-right">Cadastro</th>
                <th className="pb-2 text-right">Visto</th>
                <th className="pb-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => {
                const inativo = u.status !== "active";
                return (
                  <tr
                    key={u.id}
                    className="border-t align-middle"
                    style={{ borderColor: "var(--border)", opacity: busy === u.id ? 0.5 : 1 }}
                  >
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{u.name ?? "—"}</span>
                        {inativo && <Badge tone="danger">{u.status}</Badge>}
                        {u.trialPlan && <Badge tone="warn">trial {u.trialPlan}</Badge>}
                        {u.deletionScheduledAt && <Badge tone="danger">exclusão agendada</Badge>}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted2)" }}>
                        {u.email}
                        {u.company ? ` · ${u.company}` : ""}
                        {u.crea ? ` · CREA ${u.crea}` : ""}
                      </div>
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => change(u.id, { role: e.target.value })}
                        className="rounded border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-right tabular-nums">{u.projetos}</td>
                    <td className="py-3 text-right tabular-nums">{u.memoriais}</td>
                    <td className="py-3 text-right text-xs" style={{ color: "var(--muted2)" }}>
                      {shortDate(u.createdAt)}
                    </td>
                    <td className="py-3 text-right text-xs" style={{ color: "var(--muted2)" }}>
                      {ago(u.lastSeenAt)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          change(u.id, { status: u.status === "active" ? "blocked" : "active" })
                        }
                        className="rounded px-2 py-1 text-xs font-semibold"
                        style={{
                          background: "var(--surface3)",
                          color: u.status === "active" ? "var(--danger)" : "var(--ok)",
                        }}
                      >
                        {u.status === "active" ? "Bloquear" : "Desbloquear"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!data.rows.length && (
          <p className="py-6 text-sm" style={{ color: "var(--muted2)" }}>
            Nenhum usuário encontrado com esse filtro.
          </p>
        )}

        <p className="mt-4 text-xs" style={{ color: "var(--muted2)" }}>
          Mostrando {data.rows.length} de {num(data.total)}. Exclusão definitiva não é feita aqui —
          ela passa pelo prazo de arrependimento e sai no cron de purga.
        </p>
      </Card>
    </div>
  );
}
