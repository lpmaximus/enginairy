import { buildMemorialContent, type MemorialAuthor } from "./content";
import { renderDocx } from "./docx";
import { renderPdf } from "./pdf";
import type { EngineInput, EngineOutput } from "@/src/lib/engine/types";

export type DocFormat = "pdf" | "docx";

export const MIME: Record<DocFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Gera o arquivo do memorial no formato pedido. */
export async function renderMemorial(args: {
  input: EngineInput;
  output: EngineOutput;
  author: MemorialAuthor;
  version: number;
  format: DocFormat;
  watermark?: boolean;
}): Promise<Uint8Array> {
  const content = buildMemorialContent(args);
  return args.format === "docx" ? renderDocx(content) : renderPdf(content);
}

export * from "./content";
