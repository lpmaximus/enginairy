"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, adminPost } from "../adminClient";
import { Card, Stat, Badge, Loading, ErrorBox, ago, shortDate, num } from "../ui";

interface Enviada {
  title: string;
  body: string | null;
  link: string | null;
  destinatarios: number;
  lidas: number;
  enviadaEm: string;
}

interface Lead {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  source: string | null;
  createdAt: string;
}

interface Payload {
  enviadas: Enviada[];
  leads: Lead[];
  totalLeads: number;
  naoLidas: number;
  alcanceMaximo: number;
}

const ROLES = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "escritorio", label: "Escritório" },
  { value: "enterprise", label: "Enterprise" },
] as const;

export default function MensagensPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [alvo, setAlvo] = useState<"all" | "role">("all");
  const [role, setRole] = useState<string>("free");

  const load = useCallback(() => {
    adminFetch<Payload>("/api/admin/messages")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await adminPost<{ enviados: number }>("/api/admin/messages", {
        title: title.trim(),
        body: body.trim() || undefined,
        link: link.trim() || undefined,
        alvo,
        ...(alvo === "role" ? { role } : {}),
      });
      setFeedback(`Aviso enviado para ${res.enviados} usuário(s).`);
      setTitle("");
      setBody("");
      setLink("");
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (error && !data) return <ErrorBox message={error} />;
  if (!data) return <Loading what="as mensagens" />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Mensagens</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Aviso in-app aparece no sininho do usuário na próxima vez que ele abrir o sistema. Não é
          e-mail — quem está fora não recebe.
        </p>
      </header>

      {error && <ErrorBox message={error} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Alcance máximo" value={num(data.alcanceMaximo)} hint="contas ativas" />
        <Stat label="Avisos não lidos" value={num(data.naoLidas)} tone="warn" />
        <Stat label="Leads na lista" value={num(data.totalLeads)} tone="ok" />
      </div>

      <Card title="✉️ Novo aviso" hint="Título curto; o corpo é opcional e aceita duas ou três linhas">
        <form onSubmit={send} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título — ex.: Nova versão do motor de cálculo"
            required
            minLength={3}
            maxLength={200}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Corpo (opcional)"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
          />
          <div className="flex flex-wrap gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link interno em português — ex.: /planos"
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
            />
            <select
              value={alvo}
              onChange={(e) => setAlvo(e.target.value as "all" | "role")}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
            >
              <option value="all">Base inteira</option>
              <option value="role">Um plano</option>
            </select>
            {alvo === "role" && (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border2)", background: "var(--surface2)" }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={sending || title.trim().length < 3}
              className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--muted2)" }}>
            O link é gravado em português e traduzido para quem navega em inglês. Contas bloqueadas
            não recebem.
          </p>
          {feedback && (
            <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>
              {feedback}
            </p>
          )}
        </form>
      </Card>

      <Card title="📬 Avisos enviados" hint="Agrupados por conteúdo — um broadcast é uma linha só">
        {data.enviadas.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr
                  className="text-left text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--muted2)" }}
                >
                  <th className="pb-2">Aviso</th>
                  <th className="pb-2 text-right">Destinatários</th>
                  <th className="pb-2 text-right">Lidos</th>
                  <th className="pb-2 text-right">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {data.enviadas.map((m, i) => {
                  const taxa = m.destinatarios ? (m.lidas / m.destinatarios) * 100 : 0;
                  return (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3">
                        <div className="font-semibold">{m.title}</div>
                        {m.body && (
                          <div className="text-xs" style={{ color: "var(--muted2)" }}>
                            {m.body.slice(0, 120)}
                            {m.body.length > 120 ? "…" : ""}
                          </div>
                        )}
                        {m.link && (
                          <div className="text-xs" style={{ color: "var(--accent)" }}>
                            {m.link}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right tabular-nums">{num(m.destinatarios)}</td>
                      <td className="py-3 text-right tabular-nums">
                        {num(m.lidas)}{" "}
                        <span className="text-xs" style={{ color: "var(--muted2)" }}>
                          ({taxa.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 text-right text-xs" style={{ color: "var(--muted2)" }}>
                        {ago(m.enviadaEm)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-sm" style={{ color: "var(--muted2)" }}>
            Nenhum aviso enviado ainda.
          </p>
        )}
      </Card>

      <Card
        title="🧲 Lista de espera"
        hint="Quem deixou o e-mail no site e ainda não virou conta — matéria-prima de prospecção"
      >
        {data.leads.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr
                  className="text-left text-[11px] uppercase tracking-wider"
                  style={{ color: "var(--muted2)" }}
                >
                  <th className="pb-2">Lead</th>
                  <th className="pb-2">Empresa</th>
                  <th className="pb-2">Origem</th>
                  <th className="pb-2 text-right">Entrou</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((l) => (
                  <tr key={l.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="py-2">
                      <div className="font-semibold">{l.name ?? "—"}</div>
                      <div className="text-xs" style={{ color: "var(--muted2)" }}>
                        {l.email}
                      </div>
                    </td>
                    <td className="py-2">{l.company ?? "—"}</td>
                    <td className="py-2">{l.source ? <Badge>{l.source}</Badge> : "—"}</td>
                    <td className="py-2 text-right text-xs" style={{ color: "var(--muted2)" }}>
                      {shortDate(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-4 text-sm" style={{ color: "var(--muted2)" }}>
            Nenhum lead na lista de espera.
          </p>
        )}
      </Card>
    </div>
  );
}
