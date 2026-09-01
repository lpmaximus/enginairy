/** Renderiza o MemorialContent em DOCX (formato editável — tier pago). */
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
} from "docx";
import type { MemorialContent } from "./content";

export async function renderDocx(content: MemorialContent): Promise<Uint8Array> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({ text: content.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: content.subtitle, heading: HeadingLevel.HEADING_2 }),
  );

  if (content.watermark) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: content.watermark, bold: true, color: "B00020" })],
      }),
    );
  }

  for (const section of content.sections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));

    for (const p of section.paragraphs ?? []) {
      children.push(new Paragraph({ text: p }));
    }

    if (section.table) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: section.table.headers.map(
                (h) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                  }),
              ),
            }),
            ...section.table.rows.map(
              (row) =>
                new TableRow({
                  children: row.map(
                    (cell) => new TableCell({ children: [new Paragraph({ text: cell })] }),
                  ),
                }),
            ),
          ],
        }),
        new Paragraph({ text: "" }),
      );
    }
  }

  children.push(new Paragraph({ children: [new TextRun({ text: content.footer, size: 16 })] }));

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
