/**
 * Renderiza o MemorialContent em PDF (pdf-lib, sem headless browser).
 *
 * Layout deliberadamente sóbrio: A4, uma coluna, tabelas em largura fixa. O
 * memorial é peça técnica — legibilidade e paginação previsível valem mais que
 * capricho tipográfico, e pdf-lib roda no runtime Node da Vercel sem binário
 * externo (Chromium em serverless seria o custo que não se justifica aqui).
 */
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import type { MemorialContent } from "./content";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const LINE = 13;

export async function renderPdf(content: MemorialContent): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage(A4);
  let y = A4[1] - MARGIN;

  const newPage = () => {
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const write = (text: string, size = 10, f = font, indent = 0) => {
    // Quebra manual: pdf-lib não faz wrap. Largura útil ≈ 495 pt.
    const maxChars = Math.floor((A4[0] - 2 * MARGIN - indent) / (size * 0.5));
    const words = text.split(/\s+/);
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxChars) {
        ensure(LINE);
        page.drawText(line, { x: MARGIN + indent, y, size, font: f });
        y -= LINE;
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    if (line) {
      ensure(LINE);
      page.drawText(line, { x: MARGIN + indent, y, size, font: f });
      y -= LINE;
    }
  };

  write(content.title, 18, bold);
  y -= 4;
  write(content.subtitle, 12, bold);
  y -= 10;

  for (const section of content.sections) {
    ensure(LINE * 3);
    y -= 6;
    write(section.heading, 12, bold);
    y -= 2;

    for (const p of section.paragraphs ?? []) {
      write(p, 10);
      y -= 4;
    }

    if (section.table) {
      const cols = section.table.headers.length;
      const colW = (A4[0] - 2 * MARGIN) / cols;

      const drawRow = (cells: string[], f = font) => {
        ensure(LINE);
        cells.forEach((cell, i) => {
          const maxChars = Math.max(4, Math.floor(colW / 4.6));
          const text = cell.length > maxChars ? cell.slice(0, maxChars - 1) + "…" : cell;
          page.drawText(text, { x: MARGIN + i * colW, y, size: 8, font: f });
        });
        y -= LINE;
      };

      drawRow(section.table.headers, bold);
      page.drawLine({
        start: { x: MARGIN, y: y + 4 },
        end: { x: A4[0] - MARGIN, y: y + 4 },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      for (const row of section.table.rows) drawRow(row);
      y -= 6;
    }
  }

  y -= 10;
  write(content.footer, 8);

  if (content.watermark) {
    for (const p of pdf.getPages()) {
      p.drawText(content.watermark, {
        x: 70,
        y: 320,
        size: 26,
        font: bold,
        color: rgb(0.85, 0.2, 0.2),
        opacity: 0.22,
        rotate: degrees(38),
      });
    }
  }

  return pdf.save();
}
