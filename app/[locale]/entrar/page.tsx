"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function SignInPage() {
  const t = useTranslations("nav");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError("E-mail ou senha inválidos.");
    else window.location.href = "/projetos";
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-extrabold">{t("signIn")}</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/projetos" })}
        className="mt-6 w-full rounded border px-4 py-2 font-semibold"
        style={{ borderColor: "var(--border2)" }}
      >
        Continuar com Google
      </button>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
          style={{ borderColor: "var(--border2)", background: "var(--surface)" }}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded px-4 py-2 font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {busy ? "…" : t("signIn")}
        </button>
        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
