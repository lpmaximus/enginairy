/**
 * Provider WORKER do ECE — delega a um serviço externo e recebe o resultado
 * por webhook. Ainda não é usado em produção; existe para que a troca de
 * provider seja uma linha na factory, e não uma reescrita das rotas.
 *
 * O contrato de segurança do webhook é o mesmo do backingtrack.store:
 * assinatura HMAC verificada antes de qualquer escrita no banco, e
 * idempotência por providerJobId (o worker reenvia em timeout).
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { EngineInput, EngineOutput, EngineProvider } from "./types";

export class WorkerEngineProvider implements EngineProvider {
  readonly name = "worker";
  readonly version = "ece-worker-1.0.0";

  async run(): Promise<EngineOutput> {
    throw new Error(
      "WorkerEngineProvider é assíncrono: use enqueue() e aguarde o webhook.",
    );
  }

  async enqueue(input: EngineInput, callbackUrl: string): Promise<{ providerJobId: string }> {
    const url = process.env.ECE_WORKER_URL;
    if (!url) throw new Error("ECE_WORKER_URL não configurada");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ECE_WORKER_TOKEN ?? ""}`,
      },
      body: JSON.stringify({ input, callbackUrl }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ECE worker → ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { id: string };
    return { providerJobId: data.id };
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
    const secret = process.env.ECE_WEBHOOK_SECRET;
    const sent = headers.get("x-ece-signature");
    if (!secret || !sent) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(sent);
    // Comprimentos diferentes fazem timingSafeEqual lançar — checar antes.
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhook(rawBody: string) {
    const data = JSON.parse(rawBody) as {
      id: string;
      status: string;
      output?: EngineOutput;
      error?: string;
    };
    return {
      providerJobId: data.id,
      output: data.status === "succeeded" ? data.output : undefined,
      error: data.status === "failed" ? (data.error ?? "Falha no worker") : undefined,
    };
  }
}
