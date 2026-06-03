import { PDFDocument } from 'pdf-lib';

export interface ServerScreeningResult {
  isValid: boolean;
  error?: string;
  pageCount?: number;
}

/**
 * Validates a PDF file buffer server-side:
 * - Checks for %PDF magic bytes
 * - Verifies structural integrity by attempting to load it using pdf-lib
 * - Verifies that the parsed page count matches the expectedPageCount reported by the client
 */
export async function verifyPdfBuffer(
  buffer: Buffer,
  expectedPageCount: number
): Promise<ServerScreeningResult> {
  // 1. Verify magic bytes (%PDF)
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== '%PDF') {
    return {
      isValid: false,
      error: 'Invalid file signature. File is not a valid PDF document.',
    };
  }

  try {
    // 2. Parse PDF structure
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
    });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return {
        isValid: false,
        error: 'This PDF has 0 pages.',
      };
    }

    // 3. Match page count
    if (pageCount !== expectedPageCount) {
      return {
        isValid: false,
        error: `Page count mismatch. File contains ${pageCount} page(s), but client reported ${expectedPageCount}.`,
      };
    }

    return { isValid: true, pageCount };
  } catch (err: unknown) {
    return {
      isValid: false,
      error: `Failed to parse PDF: ${(err as Error).message || 'Corrupted structure.'}`,
    };
  }
}
