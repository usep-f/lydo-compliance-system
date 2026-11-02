import { PDFDocument } from 'pdf-lib';

export interface ServerScreeningResult {
  isValid: boolean;
  error?: string;
  pageCount?: number;
}

/**
 * Validates a document file buffer server-side:
 * - Detects Office OpenXML files (.docx, .xlsx) via ZIP header magic bytes (PK\x03\x04)
 * - Detects PDF files via %PDF magic bytes and validates structural integrity using pdf-lib
 * - Verifies that the parsed page count matches the expectedPageCount reported by the client for PDFs
 */
export async function verifyPdfBuffer(
  buffer: Buffer,
  expectedPageCount: number
): Promise<ServerScreeningResult> {
  if (!buffer || buffer.length < 4) {
    return {
      isValid: false,
      error: 'File is empty or corrupt.',
    };
  }

  // 1. Detect Office OpenXML documents (.docx, .xlsx) via ZIP magic bytes (PK\x03\x04)
  const isOfficeOpenXml =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  if (isOfficeOpenXml) {
    return {
      isValid: true,
      pageCount: expectedPageCount > 0 ? expectedPageCount : 1,
    };
  }

  // 2. Detect PDF documents via %PDF magic bytes
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== '%PDF') {
    return {
      isValid: false,
      error: 'Invalid file signature. Only PDF, Word (.docx), and Excel (.xlsx) files are supported.',
    };
  }

  try {
    // 3. Parse PDF structure
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

    // 4. Match page count for PDFs
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

/** Alias for verifyPdfBuffer to reflect general document screening. */
export const verifyDocumentBuffer = verifyPdfBuffer;
