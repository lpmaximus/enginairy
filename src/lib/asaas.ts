// Cliente Asaas API (pagamentos BR). Docs: https://docs.asaas.com
//
// Espelha o cliente do backingtrack.store. A verdade do faturamento é do
// gateway: nossa tabela `subscriptions` é espelho, atualizado pelo webhook.

const ASAAS_URL = process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3";
const ASAAS_KEY = process.env.ASAAS_API_KEY ?? "";

async function asaas<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    method,
    headers: {
      access_token: ASAAS_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  value: number;
  nextDueDate: string;
  billingType: string;
  paymentLink?: string;
}

/** Cria ou reaproveita o cliente pelo e-mail. */
export async function findOrCreateCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
}): Promise<AsaasCustomer> {
  const list = await asaas<{ data: AsaasCustomer[] }>(
    "GET",
    `/customers?email=${encodeURIComponent(data.email)}&limit=1`,
  );
  if (list.data.length > 0) return list.data[0];
  return asaas<AsaasCustomer>("POST", "/customers", data);
}

export async function createSubscription(data: {
  customerId: string;
  value: number;
  description: string;
  billingType?: "CREDIT_CARD" | "PIX" | "BOLETO" | "UNDEFINED";
  nextDueDate?: string;
}): Promise<AsaasSubscription> {
  const nextDueDate =
    data.nextDueDate ?? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  return asaas<AsaasSubscription>("POST", "/subscriptions", {
    customer: data.customerId,
    billingType: data.billingType ?? "UNDEFINED",
    value: data.value,
    nextDueDate,
    cycle: "MONTHLY",
    description: data.description,
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await asaas("DELETE", `/subscriptions/${subscriptionId}`);
}

export async function getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaas<AsaasSubscription>("GET", `/subscriptions/${subscriptionId}`);
}
