import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ComplianceData } from '../hooks/useComplianceData';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  type HistoricalSubmission,
  type PendingSubmission,
} from '../constants/submissionTypes';

/* ─────────────────────────────────────────────
   Interfaces & Types
───────────────────────────────────────────── */

export interface PdfChartFigure {
  title: string;
  subtitle?: string;
  dataUrl: string;
  heightPt?: number;
}

export interface PdfReportOptions {
  year: number;
  scope: string; // 'all' or specific barangay name
  adminName: string;
  approvedBy: string;
  approvedByTitle?: string;
  sections: {
    kpis: boolean;
    charts: boolean;
    matrix: boolean;
    submissions: boolean;
  };
  charts: PdfChartFigure[];
  compliance: ComplianceData;
  submissions: (HistoricalSubmission | PendingSubmission)[];
}

/* ─────────────────────────────────────────────
   Color & Layout Constants
───────────────────────────────────────────── */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 40;
const PRINTABLE_WIDTH = 515.28;

/* ─────────────────────────────────────────────
   Helper Functions (Anti-Monolith, Sub-30 Lines)
───────────────────────────────────────────── */

/** Formats date into readable string */
const formatReportDate = (d: Date = new Date()): string => {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/** Formats Firestore timestamp or string date safely */
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

/** Get document display label */
const getDocumentLabel = (id: string): string => {
  const doc = [...SCHEDULED_TYPES, ...ASAP_TYPES].find((d) => d.id === id);
  return doc ? doc.label : id;
};

/** Ensure sufficient vertical space or add a new page */
const checkPageBreak = (doc: jsPDF, currentY: number, requiredSpace: number): number => {
  if (currentY + requiredSpace > PAGE_HEIGHT - 60) {
    doc.addPage();
    return 60;
  }
  return currentY;
};

/* ─────────────────────────────────────────────
   Report Builders
───────────────────────────────────────────── */

/** Draws official government letterhead banner */
const drawOfficialHeader = (doc: jsPDF, scope: string, year: number): number => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('REPUBLIC OF THE PHILIPPINES', PAGE_WIDTH / 2, 45, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text('LOCAL YOUTH DEVELOPMENT OFFICE (LYDO)', PAGE_WIDTH / 2, 62, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  doc.text('YOUTH GOVERNANCE & COMPLIANCE MONITORING SYSTEM', PAGE_WIDTH / 2, 75, { align: 'center' });

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(1);
  doc.line(MARGIN_LEFT, 85, MARGIN_LEFT + PRINTABLE_WIDTH, 85);

  const isAll = scope === 'all' || !scope;
  const title = isAll
    ? 'ANNUAL COMPLIANCE & ANALYTICS AUDIT REPORT'
    : `BARANGAY COMPLIANCE DOSSIER — ${scope.toUpperCase()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Brand Indigo
  doc.text(title, PAGE_WIDTH / 2, 106, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(`Official Performance and Document Audit for Calendar Year ${year}`, PAGE_WIDTH / 2, 120, { align: 'center' });

  return 132;
};

/** Draws metadata grid card */
const drawMetadataBox = (doc: jsPDF, startY: number, options: PdfReportOptions): number => {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN_LEFT, startY, PRINTABLE_WIDTH, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const isAll = options.scope === 'all' || !options.scope;
  const scopeLabel = isAll ? 'All Registered Barangays' : options.scope;

  // Left column
  doc.text('AUDIT SCOPE:', MARGIN_LEFT + 12, startY + 18);
  doc.text('GENERATED ON:', MARGIN_LEFT + 12, startY + 34);

  // Right column
  doc.text('CALENDAR YEAR:', MARGIN_LEFT + 270, startY + 18);
  doc.text('PREPARED BY:', MARGIN_LEFT + 270, startY + 34);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(scopeLabel, MARGIN_LEFT + 85, startY + 18);
  doc.text(formatReportDate(), MARGIN_LEFT + 85, startY + 34);
  doc.text(`CY ${options.year}`, MARGIN_LEFT + 360, startY + 18);
  doc.text(`${options.adminName} (LYDO Admin)`, MARGIN_LEFT + 360, startY + 34);

  return startY + 62;
};

/** Draws a single KPI mini-card */
const drawKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accentColor: [number, number, number]
): void => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');

  doc.setFillColor(...accentColor);
  doc.rect(x, y, 4, h, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text(label.toUpperCase(), x + 10, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text(value, x + 10, y + 33);
};

/** Draws executive KPI summary section */
const drawKpiSection = (
  doc: jsPDF,
  startY: number,
  compliance: ComplianceData,
  scope: string
): number => {
  let y = checkPageBreak(doc, startY, 70);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text('I. EXECUTIVE COMPLIANCE SUMMARY', MARGIN_LEFT, y);
  y += 10;

  const isAll = scope === 'all' || !scope;
  const bData = !isAll ? compliance.barangayRanking.find((b) => b.barangay === scope) : null;
  const rateStr = isAll ? `${compliance.overallRate}%` : `${bData?.rate ?? 0}%`;

  const cardW = (PRINTABLE_WIDTH - 24) / 4;
  const cardH = 42;

  drawKpiCard(doc, MARGIN_LEFT, y, cardW, cardH, 'Overall Rate', rateStr, [79, 70, 229]);
  drawKpiCard(
    doc,
    MARGIN_LEFT + cardW + 8,
    y,
    cardW,
    cardH,
    isAll ? 'Full Compliant' : 'Approved Docs',
    isAll ? `${compliance.fullyCompliantCount}/${compliance.totalBarangays}` : `${bData?.approved ?? 0}`,
    [22, 163, 74]
  );
  drawKpiCard(
    doc,
    MARGIN_LEFT + (cardW + 8) * 2,
    y,
    cardW,
    cardH,
    'Pending Review',
    String(compliance.pendingReviewCount),
    [245, 158, 11]
  );
  drawKpiCard(
    doc,
    MARGIN_LEFT + (cardW + 8) * 3,
    y,
    cardW,
    cardH,
    'Missing / Overdue',
    String(compliance.overdueCount),
    [239, 68, 68]
  );

  return y + cardH + 20;
};

/** Draws embedded visual charts with figure captions */
const drawChartFigures = (
  doc: jsPDF,
  startY: number,
  charts: PdfChartFigure[]
): number => {
  if (charts.length === 0) return startY;
  let y = checkPageBreak(doc, startY, 60);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text('II. ANALYTICS & TREND VISUALIZATIONS', MARGIN_LEFT, y);
  y += 12;

  charts.forEach((chart, idx) => {
    const figureHeight = chart.heightPt || 170;
    y = checkPageBreak(doc, y, figureHeight + 35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    doc.text(`Figure 2.${idx + 1}: ${chart.title}`, MARGIN_LEFT, y);
    y += 8;

    if (chart.subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text(chart.subtitle, MARGIN_LEFT, y);
      y += 6;
    }

    try {
      doc.addImage(chart.dataUrl, 'PNG', MARGIN_LEFT, y, PRINTABLE_WIDTH, figureHeight);
      y += figureHeight + 16;
    } catch (e) {
      console.error('Failed to embed chart image in PDF:', e);
      y += 20;
    }
  });

  return y + 10;
};

/** Draws Compliance Matrix or Barangay Breakdown Table */
const drawComplianceMatrixTable = (
  doc: jsPDF,
  startY: number,
  compliance: ComplianceData,
  scope: string
): number => {
  let y = checkPageBreak(doc, startY, 80);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text('III. COMPLIANCE STATUS BREAKDOWN', MARGIN_LEFT, y);
  y += 10;

  const isAll = scope === 'all' || !scope;

  if (isAll) {
    const head = [['Rank', 'Barangay', 'Compliance Rate', 'Expected', 'Approved', 'Status']];
    const body = compliance.barangayRanking.map((b, i) => [
      `#${i + 1}`,
      b.barangay,
      `${b.rate}%`,
      String(b.expected),
      String(b.approved),
      b.rate === 100 ? 'Fully Compliant' : b.rate >= 75 ? 'Substantial' : 'Needs Action',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LEFT, right: MARGIN_LEFT },
      head,
      body,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  } else {
    const head = [['Category', 'Document Name', 'Period', 'Current Status']];
    const brgyCells = compliance.matrixData.filter((c) => c.barangay === scope);
    const body = brgyCells.map((cell) => [
      cell.period === 'ASAP' ? 'ASAP' : 'Scheduled',
      getDocumentLabel(cell.docType),
      cell.period,
      (cell.status || 'unknown').toUpperCase(),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN_LEFT, right: MARGIN_LEFT },
      head,
      body,
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 5 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  // Cast doc to retrieve lastAutoTable finalY
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? y) + 20;
};

/** Safely extracts submission status across historical and pending schemas */
const getSubmissionStatus = (s: HistoricalSubmission | PendingSubmission): string => {
  const item = s as unknown as { status?: string; approvedAt?: unknown; deniedAt?: unknown };
  if (item.status) return item.status;
  if (item.approvedAt) return 'approved';
  if (item.deniedAt) return 'denied';
  return 'pending';
};

/** Draws Detailed Submissions Audit Table */
const drawSubmissionsTable = (
  doc: jsPDF,
  startY: number,
  submissions: (HistoricalSubmission | PendingSubmission)[]
): number => {
  let y = checkPageBreak(doc, startY, 80);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(24, 24, 27);
  doc.text('IV. DETAILED SUBMISSION AUDIT LOGS', MARGIN_LEFT, y);
  y += 10;

  if (submissions.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    doc.text('No submission records match the selected filter criteria.', MARGIN_LEFT, y + 10);
    return y + 25;
  }

  const head = [['ID', 'Barangay', 'Submitted By', 'Document Type', 'Period', 'Status', 'Date Submitted']];
  const body = submissions.map((s) => [
    s.id ? s.id.slice(0, 8) : '—',
    s.barangay || '—',
    s.fullName || '—',
    s.documentLabel || s.documentType || '—',
    s.period || '—',
    getSubmissionStatus(s).toUpperCase(),
    formatSubmissionDate(s.submittedAt),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN_LEFT, right: MARGIN_LEFT },
    head,
    body,
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 4 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  return (lastTable?.finalY ?? y) + 25;
};

/** Draws official government certification & signatory block */
const drawSignatoryBlock = (
  doc: jsPDF,
  startY: number,
  adminName: string,
  approvedBy: string,
  approvedByTitle?: string
): void => {
  let y = checkPageBreak(doc, startY, 110);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  doc.text(
    'I hereby certify that the metrics, compliance statuses, and submission logs presented in this document have been duly generated from verified electronic filings.',
    MARGIN_LEFT,
    y,
    { maxWidth: PRINTABLE_WIDTH }
  );
  y += 35;

  const colW = PRINTABLE_WIDTH / 2;

  // Left: Prepared By
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('Prepared by:', MARGIN_LEFT, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  doc.text(adminName.toUpperCase(), MARGIN_LEFT, y + 26);
  doc.line(MARGIN_LEFT, y + 28, MARGIN_LEFT + colW - 30, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('LYDO Compliance Administrator', MARGIN_LEFT, y + 38);

  // Right: Noted & Approved By
  const rightX = MARGIN_LEFT + colW;
  doc.text('Noted & Approved by:', rightX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(24, 24, 27);
  const approver = (approvedBy || 'LOCAL YOUTH DEVELOPMENT OFFICER').toUpperCase();
  doc.text(approver, rightX, y + 26);
  doc.line(rightX, y + 28, rightX + colW - 10, y + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(approvedByTitle || 'Local Youth Development Officer', rightX, y + 38);
};

/** Adds running header and footer across all pages */
const addRunningHeadersAndFooters = (doc: jsPDF): void => {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running top header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(161, 161, 170);
    doc.text('LYDO Compliance Monitoring System — Official Government Audit Report', MARGIN_LEFT, 26);
    doc.setDrawColor(244, 244, 245);
    doc.line(MARGIN_LEFT, 30, MARGIN_LEFT + PRINTABLE_WIDTH, 30);

    // Running bottom footer
    doc.setDrawColor(244, 244, 245);
    doc.line(MARGIN_LEFT, PAGE_HEIGHT - 32, MARGIN_LEFT + PRINTABLE_WIDTH, PAGE_HEIGHT - 32);

    doc.text('Confidential Official Government Record', MARGIN_LEFT, PAGE_HEIGHT - 20);
    doc.text(`Page ${i} of ${totalPages}`, MARGIN_LEFT + PRINTABLE_WIDTH, PAGE_HEIGHT - 20, { align: 'right' });
  }
};

/* ─────────────────────────────────────────────
   Main Export Orchestrator Function
───────────────────────────────────────────── */

/** Generate and trigger download of formal official PDF audit report */
export const generateFormalPdfReport = async (options: PdfReportOptions): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // 1. Official Letterhead
  let currentY = drawOfficialHeader(doc, options.scope, options.year);

  // 2. Metadata Banner
  currentY = drawMetadataBox(doc, currentY, options);

  // 3. Modular Section A: Executive KPI Summary
  if (options.sections.kpis) {
    currentY = drawKpiSection(doc, currentY, options.compliance, options.scope);
  }

  // 4. Modular Section B: Visual Analytics Charts
  if (options.sections.charts && options.charts.length > 0) {
    currentY = drawChartFigures(doc, currentY, options.charts);
  }

  // 5. Modular Section C: Compliance Matrix Grid
  if (options.sections.matrix) {
    currentY = drawComplianceMatrixTable(doc, currentY, options.compliance, options.scope);
  }

  // 6. Modular Section D: Detailed Submission Logs
  if (options.sections.submissions) {
    currentY = drawSubmissionsTable(doc, currentY, options.submissions);
  }

  // 7. Official Signatory Certification Block
  drawSignatoryBlock(doc, currentY, options.adminName, options.approvedBy, options.approvedByTitle);

  // 8. Add Running Headers & Footers to all pages
  addRunningHeadersAndFooters(doc);

  // 9. Save PDF file
  const isAll = options.scope === 'all' || !options.scope;
  const scopeTag = isAll ? 'All_Barangays' : options.scope.replace(/\s+/g, '_');
  const dateTag = new Date().toISOString().split('T')[0];
  doc.save(`LYDO_Official_Report_${scopeTag}_CY${options.year}_${dateTag}.pdf`);
};
