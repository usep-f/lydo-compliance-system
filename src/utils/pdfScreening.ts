// ---------------------------------------------------------------------------
// Document Pre-Screening — Client-side validation for PDF, Word, and Excel files
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

/** Allowed file extensions. */
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx'] as const;

/** Comma-separated allowed extensions for HTML input accept attributes. */
export const ALLOWED_EXTENSION = '.pdf,.docx,.xlsx';

/** Allowed MIME types for uploads. */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

/** Primary default MIME type. */
export const ALLOWED_MIME_TYPE = 'application/pdf';

/**
 * Resolves the appropriate MIME type for a file based on extension and browser-provided type.
 */
export function getMimeTypeForFile(file: { name: string; type?: string }): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (name.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/pdf';
}

/**
 * Validates basic file constraints (extension, MIME type if set, file size).
 * Returns an error string if invalid, or null if valid.
 */
export function validateFileBasics(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasAllowedExt) {
    return 'Only PDF, Word (.docx), and Excel (.xlsx) files are accepted.';
  }

  // If MIME type is present and not generic stream, verify it is allowed
  if (
    file.type &&
    file.type !== 'application/octet-stream' &&
    !ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])
  ) {
    return 'Invalid file type. Only PDF, Word (.docx), and Excel (.xlsx) documents are accepted.';
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${sizeMB} MB). Maximum allowed size is 100 MB.`;
  }

  if (file.size === 0) {
    return 'File is empty. Please select a valid document.';
  }

  return null;
}

/**
 * Builds screening result for Office documents (.docx and .xlsx).
 */
function screenOfficeDocument(file: File): PdfScreeningResult {
  const lowerName = file.name.toLowerCase();
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const isDocx = lowerName.endsWith('.docx');

  return {
    isValid: true,
    pageCount: 1,
    fileSize: file.size,
    metadata: {
      title: baseName,
      author: '',
      producer: isDocx ? 'Microsoft Word Document' : 'Microsoft Excel Spreadsheet',
      creationDate: file.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString(),
    },
  };
}

/**
 * Parses and validates a PDF file buffer using pdf-lib.
 */
async function parsePdfDocument(file: File): Promise<PdfScreeningResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() ?? '';
    const author = pdfDoc.getAuthor() ?? '';
    const producer = pdfDoc.getProducer() ?? '';
    const creationDate = pdfDoc.getCreationDate()?.toISOString() ?? '';

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
  } catch (err: unknown) {
    return {
      isValid: false,
      pageCount: 0,
      fileSize: file.size,
      metadata: { title: '', author: '', producer: '', creationDate: '' },
      error: `This file could not be read as a valid PDF. ${(err as Error).message || 'Please check the file and try again.'}`,
    };
  }
}

/**
 * Screens an uploaded document file client-side.
 * Parses PDFs via pdf-lib; validates sizes and attributes for Office documents.
 */
export async function screenPdfFile(file: File): Promise<PdfScreeningResult> {
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

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.docx') || lowerName.endsWith('.xlsx')) {
    return screenOfficeDocument(file);
  }

  return parsePdfDocument(file);
}

/** Alias for screenPdfFile to reflect general document screening. */
export const screenDocumentFile = screenPdfFile;

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
