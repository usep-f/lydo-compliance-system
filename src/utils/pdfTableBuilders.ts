import type jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import type { ComplianceData, DenialShare } from '../hooks/useComplianceData';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  type HistoricalSubmission,
  type PendingSubmission,
} from '../constants/submissionTypes';

/* ─────────────────────────────────────────────
   Executive Color Tokens & Design System
───────────────────────────────────────────── */
const TABLE_THEME = {
  headerBg: [0, 66, 110] as [number, number, number], // LYDO Deep Navy #00426E
  headerText: [255, 255, 255] as [number, number, number],
  zebraBg: [248, 250, 252] as [number, number, number], // Slate 50 #F8FAFC
  borderColor: [226, 232, 240] as [number, number, number], // Slate 200 #E2E8F0
  textDark: [15, 23, 42] as [number, number, number], // Slate 900
  textMuted: [100, 116, 139] as [number, number, number], // Slate 500
};

/* ─────────────────────────────────────────────
   Helpers (Pure Functions)
───────────────────────────────────────────── */

const getDocLabel = (id: string): string => {
  const doc = [...SCHEDULED_TYPES, ...ASAP_TYPES].find((d) => d.id === id);
  return doc ? doc.label : id;
};

const formatSubmissionDate = (val: unknown): string => {
  if (!val) return '—';
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    const ts = val as { toDate: () => Date };
    return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (val instanceof Date) {
    return val.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return String(val);
};

const getSubmissionStatus = (s: HistoricalSubmission | PendingSubmission): string => {
  const item = s as unknown as { status?: string; approvedAt?: unknown; deniedAt?: unknown };
  if (item.status) return item.status;
  if (item.approvedAt) return 'approved';
  if (item.deniedAt) return 'denied';
  return 'pending';
};

const sanitizeRemarks = (text: string): string => {
  if (!text) return '—';
  const slurs = [/\bnigger\b/gi, /\bfuck\b/gi, /\bshit\b/gi, /\bbitch\b/gi, /\basshole\b/gi];
  let cleaned = text;
  slurs.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  });
  return cleaned.trim();
};

/** Helper to apply pill badge styles based on compliance or submission status */
const applyStatusPillStyle = (data: CellHookData, statusVal: string): void => {
  const normalized = statusVal.toUpperCase();
  if (normalized.includes('FULLY') || normalized === 'APPROVED' || normalized.includes('100%')) {
    data.cell.styles.fillColor = [220, 252, 231]; // Emerald 100
    data.cell.styles.textColor = [21, 128, 61];   // Emerald 700
    data.cell.styles.fontStyle = 'bold';
  } else if (normalized.includes('SUBSTANTIAL') || normalized === 'PENDING' || normalized.includes('MODERATE')) {
    data.cell.styles.fillColor = [254, 243, 199]; // Amber 100
    data.cell.styles.textColor = [180, 83, 9];    // Amber 700
    data.cell.styles.fontStyle = 'bold';
  } else {
    data.cell.styles.fillColor = [255, 228, 230]; // Rose 100
    data.cell.styles.textColor = [190, 18, 60];   // Rose 700
    data.cell.styles.fontStyle = 'bold';
  }
};

/* ─────────────────────────────────────────────
   Table Builders
───────────────────────────────────────────── */

/** Draws Municipal Compliance Matrix or Barangay Breakdown Table */
export const drawComplianceMatrixTable = (
  doc: jsPDF,
  startY: number,
  compliance: ComplianceData,
  scope: string,
  marginLeft: number,
  printableWidth?: number
): number => {
  const isAll = scope === 'all' || !scope;

  if (isAll) {
    const head = [['Rank', 'Barangay Entity', 'Compliance Rate', 'Expected', 'Approved', 'Missing', 'Status']];
    const body = compliance.barangayRanking.map((b, i) => {
      const missing = Math.max(0, b.expected - b.approved);
      return [
        `#${i + 1}`,
        b.barangay,
        `${b.rate}%`,
        String(b.expected),
        String(b.approved),
        String(missing),
        b.rate === 100 ? 'Fully Compliant' : b.rate >= 75 ? 'Substantial' : 'Needs Action',
      ];
    });

    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginLeft },
      tableWidth: printableWidth,
      head,
      body,
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_THEME.headerBg,
        textColor: TABLE_THEME.headerText,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        halign: 'left',
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 },
        overflow: 'linebreak',
        lineColor: TABLE_THEME.borderColor,
        lineWidth: 0.4,
        textColor: TABLE_THEME.textDark,
      },
      columnStyles: {
        0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
        2: { cellWidth: 88, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 58, halign: 'right' },
        4: { cellWidth: 58, halign: 'right' },
        5: { cellWidth: 58, halign: 'right' },
        6: { cellWidth: 100, halign: 'center' },
      },
      alternateRowStyles: { fillColor: TABLE_THEME.zebraBg },
      didParseCell: (data) => {
        if (data.section === 'head') {
          if ([0, 6].includes(data.column.index)) data.cell.styles.halign = 'center';
          if ([2, 3, 4, 5].includes(data.column.index)) data.cell.styles.halign = 'right';
        }
        if (data.section === 'body' && data.column.index === 6) {
          applyStatusPillStyle(data, String(data.cell.raw));
        }
      },
    });
  } else {
    const head = [['Document Category', 'Statutory Document Label', 'Applicable Period', 'Filing Status']];
    const brgyCells = compliance.matrixData.filter((c) => c.barangay === scope);
    const body = brgyCells.map((cell) => [
      cell.period === 'ASAP' ? 'Immediate Requirement (ASAP)' : 'Scheduled Periodic Document',
      getDocLabel(cell.docType),
      cell.period,
      (cell.status || 'unknown').toUpperCase(),
    ]);

    autoTable(doc, {
      startY,
      margin: { left: marginLeft, right: marginLeft },
      tableWidth: printableWidth,
      head,
      body,
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_THEME.headerBg,
        textColor: TABLE_THEME.headerText,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 },
        overflow: 'linebreak',
        lineColor: TABLE_THEME.borderColor,
        lineWidth: 0.4,
        textColor: TABLE_THEME.textDark,
      },
      columnStyles: {
        0: { cellWidth: 170 },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 110, halign: 'center' },
        3: { cellWidth: 100, halign: 'center' },
      },
      alternateRowStyles: { fillColor: TABLE_THEME.zebraBg },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          applyStatusPillStyle(data, String(data.cell.raw));
        }
      },
    });
  }

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? startY) + 16;
};

/** Draws Denial Reasons Breakdown Table */
export const drawDenialBreakdownTable = (
  doc: jsPDF,
  startY: number,
  denialShares: DenialShare[],
  totalDenied: number,
  marginLeft: number,
  tableWidth?: number
): number => {
  if (totalDenied === 0 || denialShares.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginLeft, startY, tableWidth || 480, 32, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61);
    doc.text('✓ 100% Submission Acceptance (Zero Rejections)', marginLeft + 12, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(74, 222, 128);
    doc.text('All evaluated document filings for this scope and calendar period met statutory standards.', marginLeft + 12, startY + 24);
    return startY + 40;
  }

  const head = [['Denial Reason / Statutory Deficiency', 'Count', 'Share (%)', 'Impact Level']];
  const body = denialShares.map((d) => [
    d.label,
    String(d.count),
    `${d.percentage}%`,
    d.percentage >= 35 ? 'Primary Factor' : d.percentage >= 15 ? 'Moderate' : 'Low',
  ]);

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: tableWidth ? undefined : marginLeft },
    tableWidth: tableWidth,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: TABLE_THEME.headerBg,
      textColor: TABLE_THEME.headerText,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      overflow: 'linebreak',
      lineColor: TABLE_THEME.borderColor,
      lineWidth: 0.35,
      textColor: TABLE_THEME.textDark,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 85, halign: 'center' },
    },
    alternateRowStyles: { fillColor: TABLE_THEME.zebraBg },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if ([1, 2].includes(data.column.index)) data.cell.styles.halign = 'right';
        if (data.column.index === 3) data.cell.styles.halign = 'center';
      }
      if (data.section === 'body' && data.column.index === 3) {
        applyStatusPillStyle(data, String(data.cell.raw));
      }
    },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? startY) + 14;
};

/** Draws Youth Development Accomplishments Breakdown Table */
export const drawAccomplishmentsSummaryTable = (
  doc: jsPDF,
  startY: number,
  items: { label: string; submitted: number; approved: number; denied: number }[],
  marginLeft: number,
  tableWidth?: number
): number => {
  const head = [['Youth Priority Area (10 Statutory Areas)', 'Submitted', 'Approved', 'Denied', 'Approval %']];
  const body = items.map((cat) => {
    const rate = cat.submitted > 0 ? Math.round((cat.approved / cat.submitted) * 100) : 0;
    return [
      cat.label,
      String(cat.submitted),
      String(cat.approved),
      String(cat.denied),
      `${rate}%`,
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: tableWidth ? undefined : marginLeft },
    tableWidth: tableWidth,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: TABLE_THEME.headerBg,
      textColor: TABLE_THEME.headerText,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      overflow: 'linebreak',
      lineColor: TABLE_THEME.borderColor,
      lineWidth: 0.35,
      textColor: TABLE_THEME.textDark,
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'right' },
      2: { cellWidth: 55, halign: 'right' },
      3: { cellWidth: 50, halign: 'right' },
      4: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: TABLE_THEME.zebraBg },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.halign = 'right';
      }
    },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? startY) + 14;
};

/** Draws Detailed Submissions Audit Table with Row Capping & Pagination */
export const drawSubmissionsAuditTable = (
  doc: jsPDF,
  startY: number,
  submissions: (HistoricalSubmission | PendingSubmission)[],
  marginLeft: number,
  printableWidth: number,
  limit = 100
): number => {
  if (submissions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No submission records match the selected filter criteria.', marginLeft, startY + 14);
    return startY + 30;
  }

  const cappedList = submissions.slice(0, limit);
  const head = [['#', 'Barangay', 'Submitted By', 'Document Type', 'Period', 'Status', 'Date', 'Notes / Review Remarks']];

  const body = cappedList.map((s, idx) => {
    const hist = s as HistoricalSubmission;
    const rawNote = hist.denialCategory
      ? `[${hist.denialCategory}] ${hist.reviewNotes || ''}`
      : hist.reviewNotes || '—';
    const note = sanitizeRemarks(rawNote);

    return [
      `#${idx + 1}`,
      s.barangay || '—',
      s.fullName || '—',
      s.documentLabel || s.documentType || '—',
      s.period || '—',
      getSubmissionStatus(s).toUpperCase(),
      formatSubmissionDate(s.submittedAt),
      note,
    ];
  });

  autoTable(doc, {
    startY,
    margin: { left: marginLeft, right: marginLeft },
    tableWidth: printableWidth,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: TABLE_THEME.headerBg,
      textColor: TABLE_THEME.headerText,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 4.5, bottom: 4.5, left: 4, right: 4 },
    },
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      overflow: 'linebreak',
      lineColor: TABLE_THEME.borderColor,
      lineWidth: 0.35,
      textColor: TABLE_THEME.textDark,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 78, fontStyle: 'bold' },
      2: { cellWidth: 82 },
      3: { cellWidth: 105 },
      4: { cellWidth: 44, halign: 'center' },
      5: { cellWidth: 64, halign: 'center' },
      6: { cellWidth: 55, halign: 'center' },
      7: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: TABLE_THEME.zebraBg },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if ([0, 4, 5, 6].includes(data.column.index)) data.cell.styles.halign = 'center';
      }
      if (data.section === 'body' && data.column.index === 5) {
        applyStatusPillStyle(data, String(data.cell.raw));
      }
    },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  let finalY = (lastTable?.finalY ?? startY) + 10;

  // Render Capped Submissions Notice Callout
  if (submissions.length > limit) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginLeft, finalY, printableWidth, 24, 3, 3, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Displaying most recent ${limit} of ${submissions.length} submission filings. Please export the companion Submissions CSV for exhaustive history.`,
      marginLeft + 10,
      finalY + 15
    );
    finalY += 30;
  }

  return finalY;
};
