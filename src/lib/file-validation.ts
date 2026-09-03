const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const PDF_MAGIC_BYTES = Buffer.from("%PDF-");

export interface FileValidationError {
  code: "invalid_type" | "too_large" | "empty" | "not_a_pdf";
  message: string;
}

export function validateSyllabusFile(
  file: { type: string; size: number; name: string },
  buffer: Buffer
): FileValidationError | null {
  if (file.size === 0) {
    return { code: "empty", message: "The file is empty." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "too_large",
      message: `The file is too large. The limit is ${
        MAX_FILE_SIZE_BYTES / (1024 * 1024)
      }MB.`,
    };
  }

  const looksLikePdfName = file.name.toLowerCase().endsWith(".pdf");
  const looksLikePdfType = file.type === "application/pdf" || file.type === "";
  if (!looksLikePdfName || !looksLikePdfType) {
    return {
      code: "invalid_type",
      message: "Only PDF files are supported.",
    };
  }

  // Integrity check: real PDFs start with the %PDF- magic bytes. This
  // catches a renamed non-PDF file before we ever hand it to the parser.
  if (!buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
    return {
      code: "not_a_pdf",
      message: "This file doesn't look like a valid PDF.",
    };
  }

  return null;
}
