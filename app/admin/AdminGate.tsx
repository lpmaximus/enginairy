"use client";

import { useState } from "react";
import { getAdminPassword, setAdminPassword } from "./adminClient";

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(() => Boolean(getAdminPassword()));
  const [value, setValue] = useState("");

  if (ok) return <>{children}</>;

  return (
    <div className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-xl font-bold">Painel administrativo</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Acesso por senha compartilhada (ADMIN_PASSWORD). A senha vale enquanto a
        aba estiver aberta.
      </p>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAdminPassword(value);
          setOk(true);
        }}
      >
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Senha"
          className="flex-1 rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <button className="rounded px-4 py-2 font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
