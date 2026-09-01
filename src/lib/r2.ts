/**
 * Cliente R2 (Cloudflare) + helpers de presigned URL e deleção.
 *
 * Guarda memoriais emitidos (PDF/DOCX), plantas anexadas e catálogos OEM.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/** Presigned PUT (upload direto browser → R2) + URL pública final. */
export async function presignPut(key: string, contentType: string, expiresIn = 900) {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(R2, command, { expiresIn });
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  return { uploadUrl, publicUrl };
}

/**
 * Presigned GET — link temporário de LEITURA.
 *
 * O memorial NÃO é servido por URL pública permanente: é documento de projeto
 * de um cliente identificado, com endereço da obra e nome do responsável
 * técnico. Link assinado morre em uma hora; não é sigilo perfeito, mas troca
 * "exposto para sempre a quem descobrir a URL" por "exposto por uma hora a
 * quem já tinha sessão".
 */
export async function presignGet(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(R2, command, { expiresIn });
}

/** Sobe um buffer já em memória (saída do gerador de PDF/DOCX). */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  await R2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

/** Baixa de uma URL externa (saída de worker) e republica no nosso bucket. */
export async function putObjectFromUrl(key: string, sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Falha ao baixar ${sourceUrl}: ${res.status}`);
  const contentType = res.headers.get("content-type") || "application/pdf";
  const body = new Uint8Array(await res.arrayBuffer());
  return putObject(key, body, contentType);
}

export async function deleteObject(key: string) {
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Extrai a key a partir da URL pública (inverso de presignPut). */
export function keyFromPublicUrl(publicUrl: string): string | null {
  const base = process.env.R2_PUBLIC_URL;
  if (!base || !publicUrl.startsWith(base)) return null;
  return publicUrl.slice(base.length).replace(/^\//, "");
}

/** Sanitiza uma key: só prefixos conhecidos e caracteres seguros. */
export function sanitizeKey(key: string): string | null {
  const safe = key.replace(/[^a-zA-Z0-9/_.\-]/g, "");
  const allowed = ["memoriais/", "projetos/", "catalogos/", "logos/"];
  if (!allowed.some((p) => safe.startsWith(p))) return null;
  return safe;
}
