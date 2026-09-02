/**
 * Cliente do painel admin. A senha fica em sessionStorage (não localStorage):
 * fechar a aba encerra o acesso, o que é o comportamento certo para um segredo
 * compartilhado que não é sessão de usuário.
 */
export const ADMIN_KEY = "enginairy_admin_password";

export function getAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ADMIN_KEY);
  } catch {
    return null;
  }
}

export function setAdminPassword(value: string): void {
  try {
    window.sessionStorage.setItem(ADMIN_KEY, value);
  } catch {
    /* modo privado bloqueia storage — segue sem persistir */
  }
}

export function clearAdminPassword(): void {
  try {
    window.sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    /* idem */
  }
}

/**
 * Erro de API com o status preservado. O painel precisa distinguir 401 (senha
 * errada → pedir de novo) de 500 (falha do servidor → mostrar a mensagem);
 * um `Error` genérico obrigaria a fazer parse de string.
 */
export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "x-admin-password": getAdminPassword() ?? "",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // A rota devolve { error }; se não devolver, o status já diz o suficiente.
    const detail = await res
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => null);
    throw new AdminError(detail ?? `${path} → ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export function adminFetch<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function adminPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function adminPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}
