"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";

interface Project {
  id: number;
  name: string;
  client: string | null;
  city: string | null;
  status: string;
  normCode: string;
  updatedAt: string;
}

interface Quota {
  used: number;
  limit: number;
  remaining: number;
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tq = useTranslations("quota");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        {quota && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {tq("remaining", { remaining: quota.remaining, limit: quota.limit })}
          </span>
        )}
      </div>

      {projects === null && (
        <p className="mt-8" style={{ color: "var(--muted)" }}>
          Carregando…
        </p>
      )}

      {projects?.length === 0 && (
        <p className="mt-8" style={{ color: "var(--muted)" }}>
          {t("empty")}
        </p>
      )}

      {projects && projects.length > 0 && (
        <table className="tabela-tecnica mt-8">
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Cliente</th>
              <th>Norma</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={{ pathname: "/projetos/[id]", params: { id: String(p.id) } }}>
                    {p.name}
                  </Link>
                </td>
                <td>{p.client ?? "—"}</td>
                <td>{p.normCode}</td>
                <td>{t(`status.${p.status}` as "status.draft")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
