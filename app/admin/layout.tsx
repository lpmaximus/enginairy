"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGate from "./AdminGate";
import { clearAdminPassword } from "./adminClient";

/**
 * Shell do painel — mesma navegação do admin do backingtrack.store: uma faixa
 * de abas no topo, cada módulo numa rota própria.
 *
 * Abas como ROTAS e não estado: o operador manda "abre a Audiência dos últimos
 * 90 dias" colando um link, o botão voltar funciona, e cada módulo carrega só
 * a própria consulta — a Audiência bate no GA4 e é a mais cara de todas.
 *
 * O gate envolve o layout, então nenhum módulo precisa se proteger sozinho.
 * Ele é só a porta da interface; quem barra de verdade é `isAdminRequest` em
 * cada rota de /api/admin.
 */
const TABS = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/usuarios", label: "Usuários", icon: "👥" },
  { href: "/admin/consumo", label: "Consumo", icon: "📈" },
  { href: "/admin/audiencia", label: "Audiência", icon: "🌐" },
  { href: "/admin/mensagens", label: "Mensagens", icon: "📣" },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGate>
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <nav
          className="border-b"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-3">
            <Link
              href="/"
              className="mr-2 text-sm font-bold"
              style={{ color: "var(--muted)" }}
            >
              ← Admin
            </Link>

            {TABS.map((tab) => {
              // Igualdade exata: prefixo faria /admin casar com todas as abas.
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                  style={
                    active
                      ? { background: "var(--accent)", color: "#fff" }
                      : { background: "var(--surface2)", color: "var(--text)" }
                  }
                >
                  <span aria-hidden>{tab.icon}</span> {tab.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => {
                clearAdminPassword();
                window.location.reload();
              }}
              className="ml-auto text-xs font-semibold"
              style={{ color: "var(--muted2)" }}
            >
              Sair
            </button>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </div>
    </AdminGate>
  );
}
