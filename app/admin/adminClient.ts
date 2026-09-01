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

export async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { "x-admin-password": getAdminPassword() ?? "" } });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<T>;
}
