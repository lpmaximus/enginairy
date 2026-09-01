/**
 * Camada central de autorização (ADR-ENG-002).
 *
 * Fonte única de verdade para "o que cada tipo de usuário pode fazer".
 * Substitui checagens de role soltas rota a rota.
 *
 * Módulo PURO — não toca o banco. Quem chama resolve antes o booleano de
 * vínculo com escritório e passa pronto.
 *
 * ORDEM DE PODER: free < equipe < pro < escritorio < enterprise < admin.
 * `equipe` é estado DERIVADO (role 'free' + membro ativo de escritório com
 * assinatura ativa), não um valor de users.role.
 */
export type UserType =
  | "free"
  | "equipe"
  | "pro"
  | "escritorio"
  | "enterprise"
  | "admin";

export type Action =
  | "create_project"       // criar projeto novo
  | "generate_memorial"    // rodar o ECE e emitir o memorial
  | "export_docx"          // baixar em DOCX editável (PDF todo mundo baixa)
  | "remove_watermark"     // memorial sem marca d'água de avaliação
  | "oem_catalog"          // seleção assistida no catálogo Daikin/Carrier/Midea
  | "custom_branding"      // logo e cabeçalho do escritório no documento
  | "manage_org"           // criar/administrar escritório e membros
  | "share_project"        // compartilhar projeto com outro engenheiro
  | "audit_trail"          // ver a trilha completa de revisões do projeto
  | "api_access";          // integrar via API (roadmap enterprise)

export function resolveUserType(
  role?: string | null,
  isActiveOrgMember = false,
): UserType {
  if (role === "admin") return "admin";
  if (role === "enterprise") return "enterprise";
  if (role === "escritorio") return "escritorio";
  if (role === "pro") return "pro";
  return isActiveOrgMember ? "equipe" : "free";
}

// Matriz de capacidades. admin ⊃ enterprise ⊃ escritorio ⊃ pro.
// Quem adicionar capability nova: esquecer um tier superior no Set é quase
// sempre um bug, não uma decisão.
const CAPABILITIES: Record<Action, ReadonlySet<UserType>> = {
  // O Free CRIA e CALCULA — é a isca de conversão. O que ele não faz é levar
  // o documento embora sem marca d'água nem em formato editável.
  create_project: new Set(["free", "equipe", "pro", "escritorio", "enterprise", "admin"]),
  generate_memorial: new Set(["free", "equipe", "pro", "escritorio", "enterprise", "admin"]),

  remove_watermark: new Set(["pro", "escritorio", "enterprise", "admin"]),
  export_docx: new Set(["pro", "escritorio", "enterprise", "admin"]),
  oem_catalog: new Set(["pro", "escritorio", "enterprise", "admin"]),
  share_project: new Set(["equipe", "pro", "escritorio", "enterprise", "admin"]),
  audit_trail: new Set(["pro", "escritorio", "enterprise", "admin"]),

  // Exclusivas de quem paga por escritório — é o que o tier vende.
  custom_branding: new Set(["escritorio", "enterprise", "admin"]),
  manage_org: new Set(["escritorio", "enterprise", "admin"]),

  api_access: new Set(["enterprise", "admin"]),
};

/**
 * A marca d'água do plano Free não é enfeite: um memorial descritivo é peça de
 * responsabilidade técnica assinada. Entregar o documento final de graça e sem
 * marca convida ao uso do cálculo sem que ninguém responda por ele. O Free vê
 * o resultado completo na tela e leva o PDF marcado — o suficiente para
 * avaliar a ferramenta, não para protocolar.
 */
export const FREE_TIER_WATERMARK = true;

export function can(userType: UserType, action: Action): boolean {
  return CAPABILITIES[action].has(userType);
}

/** Atalho: resolve o tipo e consulta a capacidade num passo só. */
export function roleCan(
  role: string | null | undefined,
  action: Action,
  isActiveOrgMember = false,
): boolean {
  return can(resolveUserType(role, isActiveOrgMember), action);
}
