import { extractText, getDocumentProxy } from "unpdf";

export class PdfExtractionError extends Error {}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch {
    throw new PdfExtractionError(
      "This file couldn't be read as a PDF. It may be corrupted or in an unsupported format."
    );
  }

  try {
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    throw new PdfExtractionError(
      "CourseForge couldn't extract text from this PDF. Scanned/image-only PDFs aren't supported yet."
    );
  }
}
