// ---------------------------------------------------------------------------
// PDF Pre-Screening — Client-side PDF validation using pdf-lib
// ---------------------------------------------------------------------------

import { PDFDocument } from 'pdf-lib';

export interface PdfScreeningResult {
  isValid: boolean;
  pageCount: number;
  fileSize: number;
  metadata: {
    title: string;
    author: string;
    producer: string;
    creationDate: string;
  };
  error?: string;
}

/** Maximum allowed file size in bytes (100 MB). */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** Allowed MIME type for uploads. */
export const ALLOWED_MIME_TYPE = 'application/pdf';

/** Allowed file extension. */
export const ALLOWED_EXTENSION = '.pdf';

/**
 * Validates a file before upload:
 * - Checks extension is .pdf
 * - Checks MIME type is application/pdf
 * - Checks file size ≤ 100 MB
 * Returns an error message if invalid, or null if valid.
 */
export function validateFileBasics(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
    return 'Only PDF files are accepted. Please select a .pdf file.';
  }

  if (file.type && file.type !== ALLOWED_MIME_TYPE) {
    return 'Invalid file type. Only PDF documents (application/pdf) are accepted.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${sizeMB} MB). Maximum allowed size is 100 MB.`;
  }

  if (file.size === 0) {
    return 'File is empty. Please select a valid PDF document.';
  }

  return null;
}

/**
 * Parses a PDF file using pdf-lib and extracts metadata.
 * This runs entirely client-side — no server call needed.
 *
 * For scanned documents: title/author will be empty, pageCount and
 * producer will still be available. This is expected and normal.
 */
export async function screenPdfFile(file: File): Promise<PdfScreeningResult> {
  // Step 1: Basic validation
  const basicError = validateFileBasics(file);
  if (basicError) {
    return {
      isValid: false,
      pageCount: 0,
      fileSize: file.size,
      metadata: { title: '', author: '', producer: '', creationDate: '' },
      error: basicError,
    };
  }

  try {
    // Step 2: Read the file into an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Step 3: Parse with pdf-lib (validates PDF structure)
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      // Don't throw on encrypted or damaged PDFs — we'll handle gracefully
      ignoreEncryption: true,
    });

    // Step 4: Extract metadata
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() ?? '';
    const author = pdfDoc.getAuthor() ?? '';
    const producer = pdfDoc.getProducer() ?? '';
    const creationDate = pdfDoc.getCreationDate()?.toISOString() ?? '';

    // Step 5: Sanity check — 0-page PDF is suspicious
    if (pageCount === 0) {
      return {
        isValid: false,
        pageCount: 0,
        fileSize: file.size,
        metadata: { title, author, producer, creationDate },
        error: 'This PDF has 0 pages. Please upload a valid document.',
      };
    }

    return {
      isValid: true,
      pageCount,
      fileSize: file.size,
      metadata: { title, author, producer, creationDate },
    };
  } catch (err: any) {
    return {
      isValid: false,
      pageCount: 0,
      fileSize: file.size,
      metadata: { title: '', author: '', producer: '', creationDate: '' },
      error: `This file could not be read as a valid PDF. ${err.message || 'Please check the file and try again.'}`,
    };
  }
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
