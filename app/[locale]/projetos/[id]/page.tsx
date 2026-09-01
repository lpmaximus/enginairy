"use client";

import { use, useCallback, useEffect, useState } from "react";

interface RoomResult {
  roomId: number;
  name: string;
  loads: { people: number; lighting: number; equipment: number; envelope: number; ventilation: number; total: number };
  supplyAirflow: number;
  outdoorAirflow: number;
  capacityTr: number;
}

interface CalcRow {
  id: number;
  version: number;
  normCode: string;
  engineVersion: string;
  results: { rooms: RoomResult[]; totals: { coolingLoad: number; capacityTr: number } };
  warnings: { code: string; severity: string; message: string }[] | null;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ project: { name: string; status: string }; calculations: CalcRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Falha ao carregar o projeto."));
  }, [id]);

  useEffect(load, [load]);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Falha na operação.");
      return;
    }
    load();
  }

  if (!data) return <p className="px-6 py-12">Carregando…</p>;

  const latest = data.calculations[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-extrabold">{data.project.name}</h1>

      <div className="mt-6 flex gap-3">
        <button
          disabled={busy}
          onClick={() => run("calc")}
          className="rounded px-4 py-2 font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Calcular
        </button>
        <button
          disabled={busy || !latest}
          onClick={() => run("memorial", { format: "pdf" })}
          className="rounded border px-4 py-2 font-semibold"
          style={{ borderColor: "var(--border2)" }}
        >
          Emitir memorial (PDF)
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {latest && (
        <section className="mt-10">
          <h2 className="font-semibold">
            Revisão {latest.version} · {latest.normCode} · {latest.engineVersion}
          </h2>

          <table className="tabela-tecnica mt-4">
            <thead>
              <tr>
                <th>Ambiente</th>
                <th className="num">Pessoas</th>
                <th className="num">Iluminação</th>
                <th className="num">Equip.</th>
                <th className="num">Envoltória</th>
                <th className="num">Ar ext.</th>
                <th className="num">Total (W)</th>
                <th className="num">TR</th>
              </tr>
            </thead>
            <tbody>
              {latest.results.rooms.map((r) => (
                <tr key={r.roomId}>
                  <td>{r.name}</td>
                  <td className="num">{r.loads.people.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.loads.lighting.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.loads.equipment.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.loads.envelope.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.loads.ventilation.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.loads.total.toLocaleString("pt-BR")}</td>
                  <td className="num">{r.capacityTr.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {latest.warnings && latest.warnings.length > 0 && (
            <ul className="mt-6 flex flex-col gap-2 text-sm">
              {latest.warnings.map((w, i) => (
                <li
                  key={i}
                  style={{
                    color:
                      w.severity === "error"
                        ? "var(--danger)"
                        : w.severity === "warning"
                          ? "var(--warn)"
                          : "var(--muted)",
                  }}
                >
                  <strong>{w.code}</strong> — {w.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
