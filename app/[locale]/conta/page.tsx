"use client";

import { useEffect, useState } from "react";

interface Me {
  email: string;
  name: string | null;
  company: string | null;
  crea: string | null;
  role: string;
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    await fetch("/api/account/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: me.name, company: me.company, crea: me.crea }),
    });
    setSaved(true);
  }

  if (!me) return <p className="px-6 py-12">Carregando…</p>;

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-2xl font-extrabold">Conta</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Estes dados vão para o rodapé de todo memorial emitido.
      </p>

      <form onSubmit={save} className="mt-6 flex flex-col gap-3">
        <input value={me.email} disabled className="rounded border px-3 py-2" style={{ borderColor: "var(--border)" }} />
        <input
          placeholder="Nome"
          value={me.name ?? ""}
          onChange={(e) => setMe({ ...me, name: e.target.value })}
          className="rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <input
          placeholder="Empresa"
          value={me.company ?? ""}
          onChange={(e) => setMe({ ...me, company: e.target.value })}
          className="rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <input
          placeholder="CREA"
          value={me.crea ?? ""}
          onChange={(e) => setMe({ ...me, crea: e.target.value })}
          className="rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <button type="submit" className="rounded px-4 py-2 font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
          Salvar
        </button>
        {saved && <p className="text-sm" style={{ color: "var(--ok)" }}>Salvo.</p>}
      </form>
    </div>
  );
}
