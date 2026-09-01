"use client";

import { useEffect, useState } from "react";
import AdminGate from "./AdminGate";
import { adminFetch } from "./adminClient";

interface Dashboard {
  usuarios: number;
  projetos: number;
  memoriais: number;
  jobsFalhados: number;
  mrr: number;
  margemEstimada: number;
}

function Painel() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<Dashboard>("/api/admin/dashboard").then(setData).catch(() => setError("Senha inválida ou falha na API."));
  }, []);

  if (error) return <p className="px-6 py-12" style={{ color: "var(--danger)" }}>{error}</p>;
  if (!data) return <p className="px-6 py-12">Carregando…</p>;

  const cards: [string, string][] = [
    ["Usuários", String(data.usuarios)],
    ["Projetos", String(data.projetos)],
    ["Memoriais emitidos", String(data.memoriais)],
    ["Jobs falhados", String(data.jobsFalhados)],
    ["MRR", data.mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
    ["Margem estimada", data.margemEstimada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })],
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-extrabold">Operação</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <Painel />
    </AdminGate>
  );
}
