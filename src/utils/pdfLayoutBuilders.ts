import type jsPDF from 'jspdf';
import type { ComplianceData } from '../hooks/useComplianceData';
import {
  drawComplianceMatrixTable,
  drawDenialBreakdownTable,
  drawAccomplishmentsSummaryTable,
  drawSubmissionsAuditTable,
} from './pdfTableBuilders';
import { ACCOMPLISHMENT_CATEGORIES } from '../constants/submissionTypes';
import type { PdfReportOptions } from './pdfReportUtils';

/* ─────────────────────────────────────────────
   Executive Palette & Geometry Constants
───────────────────────────────────────────── */
const COLORS = {
  primaryNavy: [0, 66, 110] as [number, number, number],
  brandBlue: [0, 110, 183] as [number, number, number],
  darkSlate: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textSubtle: [148, 163, 184] as [number, number, number],
  cardBg: [248, 250, 252] as [number, number, number],
  cardBorder: [226, 232, 240] as [number, number, number],
  ruleColor: [226, 232, 240] as [number, number, number],
};

/* ─────────────────────────────────────────────
   Geometry & Coordinate Helpers
───────────────────────────────────────────── */

export const checkPageBreak = (
  doc: jsPDF,
  currentY: number,
  requiredSpace: number,
  pageHeight: number
): number => {
  if (currentY + requiredSpace > pageHeight - 45) {
    doc.addPage();
    return 45;
  }
  return currentY;
};

const formatReportDate = (d: Date = new Date()): string => {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/* ─────────────────────────────────────────────
   Stylized Section Header
───────────────────────────────────────────── */
export const drawSectionHeader = (
  doc: jsPDF,
  y: number,
  sectionNumber: string,
  sectionTitle: string,
  marginLeft: number,
  printableWidth: number
): number => {
  // Primary accent bar
  doc.setFillColor(...COLORS.brandBlue);
  doc.roundedRect(marginLeft, y - 7, 3, 9.5, 0.8, 0.8, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkSlate);
  const heading = `${sectionNumber}. ${sectionTitle.toUpperCase()}`;
  doc.text(heading, marginLeft + 7, y);

  // Subtle trailing rule line
  doc.setDrawColor(...COLORS.ruleColor);
  doc.setLineWidth(0.4);
  const textWidth = doc.getTextWidth(heading);
  doc.line(marginLeft + 10 + textWidth, y - 2.5, marginLeft + printableWidth, y - 2.5);

  return y + 6;
};

/* ─────────────────────────────────────────────
   Official Header & Letterhead
───────────────────────────────────────────── */

export const drawOfficialHeader = (
  doc: jsPDF,
  scope: string,
  year: number,
  pageWidth: number,
  printableWidth: number,
  marginLeft: number,
  isDossier: boolean
): number => {
  // Top primary accent strip
  doc.setFillColor(...COLORS.primaryNavy);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Republic Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, 24, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text('LOCAL YOUTH DEVELOPMENT OFFICE (LYDO)', pageWidth / 2, 36, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('YOUTH GOVERNANCE & COMPLIANCE MONITORING SYSTEM', pageWidth / 2, 46, { align: 'center' });

  // Divider Rule
  doc.setDrawColor(...COLORS.primaryNavy);
  doc.setLineWidth(1);
  doc.line(marginLeft, 52, marginLeft + printableWidth, 52);
  doc.setDrawColor(...COLORS.ruleColor);
  doc.setLineWidth(0.3);
  doc.line(marginLeft, 54, marginLeft + printableWidth, 54);

  const isAll = scope === 'all' || !scope;
  let title = '';
  if (isDossier) {
    title = isAll
      ? 'OFFICIAL COMPLIANCE & ANALYTICS AUDIT DOSSIER'
      : `BARANGAY COMPLIANCE AUDIT DOSSIER — ${scope.toUpperCase()}`;
  } else {
    title = isAll
      ? 'EXECUTIVE COMPLIANCE BRIEFING REPORT'
      : `EXECUTIVE COMPLIANCE BRIEF — ${scope.toUpperCase()}`;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...COLORS.primaryNavy);
  doc.text(title, pageWidth / 2, 67, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `Official Statutory Compliance Evaluation and Analytics for Calendar Year ${year}`,
    pageWidth / 2,
    77,
    { align: 'center' }
  );

  return 83;
};

/* ─────────────────────────────────────────────
   Metadata Information Card
───────────────────────────────────────────── */

export const drawMetadataBox = (
  doc: jsPDF,
  startY: number,
  options: PdfReportOptions,
  printableWidth: number,
  marginLeft: number
): number => {
  const boxH = 28;
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(marginLeft, startY, printableWidth, boxH, 3, 3, 'FD');

  const isAll = options.scope === 'all' || !options.scope;
  const scopeLabel = isAll ? 'All Registered Barangays' : options.scope;

  const colW = printableWidth / 4;

  const cols = [
    { label: 'AUDIT JURISDICTION', val: scopeLabel },
    { label: 'CALENDAR PERIOD', val: `CY ${options.year} Performance` },
    { label: 'DATE GENERATED', val: formatReportDate() },
    { label: 'AUDIT ADMINISTRATOR', val: `${options.adminName} (LYDO)` },
  ];

  cols.forEach((col, idx) => {
    const x = marginLeft + (idx * colW) + 7;
    // Tiny label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(col.label, x, startY + 10);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.darkSlate);
    doc.text(col.val, x, startY + 20);

    // Divider line between columns
    if (idx < cols.length - 1) {
      doc.setDrawColor(...COLORS.ruleColor);
      doc.setLineWidth(0.4);
      doc.line(marginLeft + ((idx + 1) * colW), startY + 5, marginLeft + ((idx + 1) * colW), startY + boxH - 5);
    }
  });

  return startY + boxH + 6;
};

/* ─────────────────────────────────────────────
   Executive KPI Scorecard
───────────────────────────────────────────── */

const drawExecutiveKpiCard = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  subtext: string,
  accentColor: [number, number, number]
): void => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');

  // Top colored accent bar
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 2.5, 1, 1, 'F');

  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(label.toUpperCase(), x + 6, y + 10.5);

  // Big Metric Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(value, x + 6, y + 22);

  // Subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLORS.textSubtle);
  doc.text(subtext, x + 6, y + 30);
};

export const drawKpiScorecard = (
  doc: jsPDF,
  startY: number,
  compliance: ComplianceData,
  scope: string,
  printableWidth: number,
  marginLeft: number,
  includeDenials = false
): number => {
  const isAll = scope === 'all' || !scope;
  const bData = !isAll ? compliance.barangayRanking.find((b) => b.barangay === scope) : null;
  const rateStr = isAll ? `${compliance.overallRate}%` : `${bData?.rate ?? 0}%`;

  const totalDenied = compliance.denialReasonShare.reduce((acc, d) => acc + d.count, 0);

  const count = includeDenials ? 5 : 4;
  const gap = 6;
  const cardW = (printableWidth - (gap * (count - 1))) / count;
  const cardH = 34;

  let x = marginLeft;
  drawExecutiveKpiCard(doc, x, startY, cardW, cardH, 'Overall Compliance', rateStr, 'Municipal statutory rate', [2, 132, 199]);
  x += cardW + gap;

  drawExecutiveKpiCard(
    doc,
    x,
    startY,
    cardW,
    cardH,
    isAll ? 'Fully Compliant' : 'Approved Filings',
    isAll ? `${compliance.fullyCompliantCount} of ${compliance.totalBarangays}` : `${bData?.approved ?? 0} docs`,
    isAll ? '100% compliant barangays' : 'Approved by LYDO',
    [16, 185, 129]
  );
  x += cardW + gap;

  drawExecutiveKpiCard(
    doc,
    x,
    startY,
    cardW,
    cardH,
    'Pending Review',
    String(compliance.pendingReviewCount),
    'Awaiting validation',
    [245, 158, 11]
  );
  x += cardW + gap;

  drawExecutiveKpiCard(
    doc,
    x,
    startY,
    cardW,
    cardH,
    'Missing / Overdue',
    String(compliance.overdueCount),
    'Action required by SK',
    [244, 63, 94]
  );

  if (includeDenials) {
    x += cardW + gap;
    drawExecutiveKpiCard(
      doc,
      x,
      startY,
      cardW,
      cardH,
      'Rejected / Denied',
      String(totalDenied),
      'Returned for corrections',
      [71, 85, 105]
    );
  }

  return startY + cardH + 7;
};

/* ─────────────────────────────────────────────
   Running Footers
───────────────────────────────────────────── */

export const addRunningHeadersAndFooters = (
  doc: jsPDF,
  _pageWidth: number,
  pageHeight: number,
  printableWidth: number,
  marginLeft: number,
  _profileLabel?: string
): void => {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running bottom footer only (clean, confidential government document)
    doc.setDrawColor(...COLORS.ruleColor);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, pageHeight - 20, marginLeft + printableWidth, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...COLORS.textSubtle);
    doc.text('Confidential Official Government Record — For Internal & Regulatory Use Only', marginLeft, pageHeight - 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, marginLeft + printableWidth, pageHeight - 12, { align: 'right' });
  }
};

/* ─────────────────────────────────────────────
   Specialized Chart Drawing Helpers (True Circular & Crisp Cards)
───────────────────────────────────────────── */

/**
 * Draws a circular doughnut/pie chart with guaranteed 1:1 true circle proportions.
 * The image is centered inside its card box without horizontal or vertical stretching.
 */
export const drawCircularDonutChart = (
  doc: jsPDF,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  title: string,
  dataUrl: string,
  centerMetric?: string,
  centerLabel?: string
): void => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');

  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(cardX, cardY, cardW, 15, 3, 3, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.line(cardX, cardY + 15, cardX + cardW, cardY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(title, cardX + 7, cardY + 10.5);

  const imgAspect = 400 / 260; // 1.538
  const availH = cardH - 18;
  const availW = cardW - 10;

  let targetH = availH;
  let targetW = targetH * imgAspect;
  if (targetW > availW) {
    targetW = availW;
    targetH = targetW / imgAspect;
  }

  const imgX = cardX + (cardW - targetW) / 2;
  const imgY = cardY + 16 + (availH - targetH) / 2;

  try {
    doc.addImage(dataUrl, 'PNG', imgX, imgY, targetW, targetH);

    if (centerMetric) {
      const cx = imgX + (targetW / 2);
      const cy = imgY + (targetH * 0.41);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...COLORS.darkSlate);
      doc.text(centerMetric, cx, cy, { align: 'center' });

      if (centerLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(centerLabel.toUpperCase(), cx, cy + 6, { align: 'center' });
      }
    }
  } catch (e) {
    console.error('Error drawing circular donut:', e);
  }
};

/**
 * Draws an executive card container for bar/line charts with proper margins and headers.
 */
export const drawStandardChartCard = (
  doc: jsPDF,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  title: string,
  dataUrl: string
): void => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');

  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(cardX, cardY, cardW, 15, 3, 3, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.line(cardX, cardY + 15, cardX + cardW, cardY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(title, cardX + 7, cardY + 10.5);

  try {
    doc.addImage(dataUrl, 'PNG', cardX + 5, cardY + 17, cardW - 10, cardH - 19);
  } catch (e) {
    console.error('Error drawing chart:', e);
  }
};

/**
 * Draws an executive governance bottleneck audit card.
 */
export const drawBottleneckCard = (
  doc: jsPDF,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  topDenial: { label: string; count: number; percentage: number } | undefined,
  totalDenied: number,
  year: number
): void => {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');

  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(cardX, cardY, cardW, 15, 3, 3, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.line(cardX, cardY + 15, cardX + cardW, cardY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text('Key Governance Bottleneck Audit', cardX + 7, cardY + 10.5);

  if (topDenial && topDenial.count > 0) {
    // Red accent strip inside card
    doc.setFillColor(225, 29, 72);
    doc.roundedRect(cardX + 7, cardY + 20, 2.5, cardH - 26, 0.5, 0.5, 'F');

    // Alert tag pill
    doc.setFillColor(255, 228, 230); // Rose 100
    doc.roundedRect(cardX + 13, cardY + 20, cardW - 20, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(190, 18, 60); // Rose 700
    doc.text('PRIMARY REJECTION FACTOR', cardX + 17, cardY + 28);

    // Denial Reason text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.darkSlate);
    const reasonText = topDenial.label.length > 26 ? `${topDenial.label.slice(0, 24)}...` : topDenial.label;
    doc.text(reasonText, cardX + 13, cardY + 42);

    // Percentage stat
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(225, 29, 72);
    doc.text(`${topDenial.percentage}%`, cardX + 13, cardY + 58);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`of all denials (${topDenial.count} of ${totalDenied})`, cardX + 46, cardY + 57);

    // Corrective Recommendation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Statutory Action: Validate SK signatures and council endorsements prior to upload.',
      cardX + 13,
      cardY + 70,
      { maxWidth: cardW - 20 }
    );
  } else {
    // 100% Acceptance State
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(cardX + 7, cardY + 20, 2.5, cardH - 26, 0.5, 0.5, 'F');

    doc.setFillColor(220, 252, 231); // Emerald 100
    doc.roundedRect(cardX + 13, cardY + 22, cardW - 20, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(21, 128, 61); // Emerald 700
    doc.text('✓ 100% SUBMISSION ACCEPTANCE', cardX + 17, cardY + 31.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...COLORS.darkSlate);
    doc.text(
      `Zero submissions returned for CY ${year}. All evaluated filings met statutory standards.`,
      cardX + 13,
      cardY + 48,
      { maxWidth: cardW - 20 }
    );
  }
};

/* ─────────────────────────────────────────────
   Profile 1: Executive Briefing Layout (Portrait A4)
───────────────────────────────────────────── */

export const buildExecutiveBriefLayout = (doc: jsPDF, options: PdfReportOptions): void => {
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 36;
  const PRINTABLE_WIDTH = PAGE_WIDTH - (MARGIN_LEFT * 2);

  const findChart = (keyword: string) =>
    options.charts.find((c) => c.title.toLowerCase().includes(keyword.toLowerCase()));

  const chartOverall = findChart('overall compliance') || options.charts[0];
  const chartTimeline = findChart('timeline') || findChart('trend') || options.charts[1];
  const chartDocType = findChart('document type') || options.charts[2];
  const chartDenial = findChart('denial') || options.charts[3];
  const chartYouthAcc = findChart('youth accomplishment') || options.charts[4];
  const chartAccPie = findChart('accomplishment report category') || findChart('accomplishment share') || options.charts[5];
  const chartRanking = findChart('ranking') || options.charts[6];

  const isAll = options.scope === 'all' || !options.scope;
  const bData = !isAll ? options.compliance.barangayRanking.find((b) => b.barangay === options.scope) : null;
  const rateStr = isAll ? `${options.compliance.overallRate}%` : `${bData?.rate ?? 0}%`;
  const totalDenied = options.compliance.denialReasonShare.reduce((acc, d) => acc + d.count, 0);
  const topDenial = options.compliance.denialReasonShare[0];
  const totalAccApproved = options.compliance.accomplishmentApprovalShare.reduce((s, a) => s + a.approved, 0);

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1: EXECUTIVE COMPLIANCE DASHBOARD (ALL 7 CHARTS + BOTTLENECK AUDIT)
  // ═════════════════════════════════════════════════════════════════════════
  let y = drawOfficialHeader(doc, options.scope, options.year, PAGE_WIDTH, PRINTABLE_WIDTH, MARGIN_LEFT, false);
  y = drawMetadataBox(doc, y, options, PRINTABLE_WIDTH, MARGIN_LEFT);

  // Section I: KPI Scorecard
  if (options.sections.kpis) {
    y = drawSectionHeader(doc, y, 'I', 'Executive Compliance Scorecard', MARGIN_LEFT, PRINTABLE_WIDTH);
    y = drawKpiScorecard(doc, y, options.compliance, options.scope, PRINTABLE_WIDTH, MARGIN_LEFT, false);
  }

  if (options.sections.charts) {
    // Section II: Statutory Compliance & Submission Activity Trends
    y = drawSectionHeader(doc, y, 'II', 'Statutory Compliance & Submission Activity Trends', MARGIN_LEFT, PRINTABLE_WIDTH);

    const rowH = 110;
    const cardGap = 8;
    const verticalGap = 6;

    // Row 1: Compliance Status Gauge (Donut) + Annual Submission Activity Timeline (Line)
    if (chartOverall && chartTimeline) {
      const gaugeW = 210;
      const timelineW = PRINTABLE_WIDTH - gaugeW - cardGap;

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT,
        y,
        gaugeW,
        rowH,
        'Compliance Status Gauge',
        chartOverall.dataUrl,
        rateStr,
        'COMPLIANT'
      );

      drawStandardChartCard(
        doc,
        MARGIN_LEFT + gaugeW + cardGap,
        y,
        timelineW,
        rowH,
        'Annual Submission Activity Timeline',
        chartTimeline.dataUrl
      );

      y += rowH + verticalGap;
    }

    // Row 2: Document Type Compliance Breakdown (Bar) + Denial Reason Breakdown (Donut)
    if (chartDocType && chartDenial) {
      const docW = 305;
      const denialW = PRINTABLE_WIDTH - docW - cardGap;

      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        docW,
        rowH,
        'Document Type Compliance Breakdown',
        chartDocType.dataUrl
      );

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT + docW + cardGap,
        y,
        denialW,
        rowH,
        'Denial Reason Breakdown',
        chartDenial.dataUrl,
        String(totalDenied),
        'REJECTIONS'
      );

      y += rowH + 8;
    }

    // Section III: Youth Development & Barangay Governance Rankings
    y = drawSectionHeader(doc, y, 'III', 'Youth Development & Governance Rankings', MARGIN_LEFT, PRINTABLE_WIDTH);

    // Row 3: Youth Accomplishments by Area (Bar) + Approved Accomplishment Share (Donut)
    if (chartYouthAcc && chartAccPie) {
      const youthW = 305;
      const shareW = PRINTABLE_WIDTH - youthW - cardGap;

      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        youthW,
        rowH,
        'Accomplishment Filings by Area (10 Areas)',
        chartYouthAcc.dataUrl
      );

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT + youthW + cardGap,
        y,
        shareW,
        rowH,
        'Approved Accomplishment Share',
        chartAccPie.dataUrl,
        String(totalAccApproved),
        'APPROVED'
      );

      y += rowH + verticalGap;
    }

    // Row 4: Barangay Compliance Ranking Bar Chart (Left) + Key Bottleneck Finding Card (Right)
    if (chartRanking) {
      const rankingW = 320;
      const bottleneckW = PRINTABLE_WIDTH - rankingW - cardGap;

      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        rankingW,
        rowH,
        'Comparative Barangay Compliance Rates',
        chartRanking.dataUrl
      );

      drawBottleneckCard(
        doc,
        MARGIN_LEFT + rankingW + cardGap,
        y,
        bottleneckW,
        rowH,
        topDenial,
        totalDenied,
        options.year
      );

      y += rowH + 10;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 2: STATUTORY COMPLIANCE MATRIX REGISTER
  // ═════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 36;

  // Section IV: Statutory Compliance Matrix Summary
  if (options.sections.matrix) {
    y = drawSectionHeader(doc, y, 'IV', 'Statutory Barangay Compliance Matrix Register', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawComplianceMatrixTable(doc, y, options.compliance, options.scope, MARGIN_LEFT);
  }

  // Running footer
  addRunningHeadersAndFooters(doc, PAGE_WIDTH, PAGE_HEIGHT, PRINTABLE_WIDTH, MARGIN_LEFT);
};

/* ─────────────────────────────────────────────
   Profile 2: Full Audit Dossier Layout (Landscape A4)
───────────────────────────────────────────── */

export const buildAuditDossierLayout = (doc: jsPDF, options: PdfReportOptions): void => {
  const PAGE_WIDTH = 841.89;
  const PAGE_HEIGHT = 595.28;
  const MARGIN_LEFT = 36;
  const PRINTABLE_WIDTH = PAGE_WIDTH - (MARGIN_LEFT * 2);
  const halfW = (PRINTABLE_WIDTH - 12) / 2;

  const findChart = (keyword: string) =>
    options.charts.find((c) => c.title.toLowerCase().includes(keyword.toLowerCase()));

  const chartOverall = findChart('overall compliance') || options.charts[0];
  const chartTimeline = findChart('timeline') || findChart('trend') || options.charts[1];
  const chartDocType = findChart('document type') || options.charts[2];
  const chartDenial = findChart('denial') || options.charts[3];
  const chartYouthAcc = findChart('youth accomplishment') || options.charts[4];
  const chartAccPie = findChart('accomplishment report category') || findChart('accomplishment share') || options.charts[5];
  const chartRanking = findChart('ranking') || options.charts[6];

  const isAll = options.scope === 'all' || !options.scope;
  const bData = !isAll ? options.compliance.barangayRanking.find((b) => b.barangay === options.scope) : null;
  const rateStr = isAll ? `${options.compliance.overallRate}%` : `${bData?.rate ?? 0}%`;
  const totalDenied = options.compliance.denialReasonShare.reduce((s, d) => s + d.count, 0);
  const topDenial = options.compliance.denialReasonShare[0];

  // ── PAGE 1: Executive Overview & Macro Analytics ───────────────────
  let y = drawOfficialHeader(doc, options.scope, options.year, PAGE_WIDTH, PRINTABLE_WIDTH, MARGIN_LEFT, true);
  y = drawMetadataBox(doc, y, options, PRINTABLE_WIDTH, MARGIN_LEFT);

  if (options.sections.kpis) {
    y = drawSectionHeader(doc, y, 'I', 'Executive KPI Scorecard & Volume Audit', MARGIN_LEFT, PRINTABLE_WIDTH);
    y = drawKpiScorecard(doc, y, options.compliance, options.scope, PRINTABLE_WIDTH, MARGIN_LEFT, true);
  }

  // Side-by-side Dual Charts (Donut True Circle + Activity Timeline)
  if (options.sections.charts && chartOverall && chartTimeline) {
    y = drawSectionHeader(doc, y, 'II', 'Macro Compliance & Submission Activity Timelines', MARGIN_LEFT, PRINTABLE_WIDTH);
    const chartCardH = 155;

    drawCircularDonutChart(
      doc,
      MARGIN_LEFT,
      y,
      halfW,
      chartCardH,
      'Overall Compliance Status Distribution',
      chartOverall.dataUrl,
      rateStr,
      'COMPLIANT'
    );

    drawStandardChartCard(
      doc,
      MARGIN_LEFT + halfW + 12,
      y,
      halfW,
      chartCardH,
      'Annual Submission Activity Timeline',
      chartTimeline.dataUrl
    );

    // Page 1 Bottleneck Banner
    if (topDenial && topDenial.count > 0) {
      const bannerY = y + chartCardH + 10;
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(MARGIN_LEFT, bannerY, PRINTABLE_WIDTH, 26, 3, 3, 'FD');

      doc.setFillColor(225, 29, 72);
      doc.roundedRect(MARGIN_LEFT, bannerY, 3.5, 26, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(159, 18, 57);
      doc.text('PRIMARY GOVERNANCE BOTTLENECK DETECTED (MUNICIPAL AUDIT FINDING):', MARGIN_LEFT + 10, bannerY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...COLORS.darkSlate);
      doc.text(
        `Leading cause of rejection across filings: "${topDenial.label}" accounting for ${topDenial.percentage}% of all denials (${topDenial.count} filings returned).`,
        MARGIN_LEFT + 10,
        bannerY + 20
      );
    }
  }

  // ── PAGE 2: Document Type Compliance & Rejection Audit ──────────────
  doc.addPage();
  y = 36;
  y = drawSectionHeader(doc, y, 'III', 'Document Type Compliance & Rejection Audit', MARGIN_LEFT, PRINTABLE_WIDTH);

  if (options.sections.charts && chartDocType && chartDenial) {
    const cardH = 130;
    drawStandardChartCard(
      doc,
      MARGIN_LEFT,
      y,
      halfW,
      cardH,
      'Document Type Compliance Breakdown',
      chartDocType.dataUrl
    );

    drawCircularDonutChart(
      doc,
      MARGIN_LEFT + halfW + 12,
      y,
      halfW,
      cardH,
      'Categorical Denial Distribution',
      chartDenial.dataUrl,
      String(totalDenied),
      'DENIALS'
    );

    y += cardH + 12;
  }

  // Denial Breakdown Data Table
  drawDenialBreakdownTable(doc, y, options.compliance.denialReasonShare, totalDenied, MARGIN_LEFT, PRINTABLE_WIDTH);

  // ── PAGE 3: Youth Development Accomplishments & Approval Share ──────
  doc.addPage();
  y = 36;
  y = drawSectionHeader(doc, y, 'IV', 'Youth Development Accomplishment Filings (10 Statutory Areas)', MARGIN_LEFT, PRINTABLE_WIDTH);

  if (options.sections.charts && chartYouthAcc && chartAccPie) {
    const cardH = 130;
    drawStandardChartCard(
      doc,
      MARGIN_LEFT,
      y,
      halfW,
      cardH,
      'Submissions by Priority Area',
      chartYouthAcc.dataUrl
    );

    drawCircularDonutChart(
      doc,
      MARGIN_LEFT + halfW + 12,
      y,
      halfW,
      cardH,
      'Approved Accomplishment Report Share',
      chartAccPie.dataUrl
    );

    y += cardH + 12;
  }

  // Youth Accomplishments Breakdown Table
  const accomplishmentSummary = isAll
    ? ACCOMPLISHMENT_CATEGORIES.map((cat) => {
        const item = options.compliance.overallPerennialSummary.items.find((i) => i.id === cat.id);
        const approved = item?.approved ?? 0;
        const denied = item?.denied ?? 0;
        const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
        return { label: cat.label, submitted, approved, denied };
      })
    : (() => {
        const entry = options.compliance.barangayPerennialSummary.find((s) => s.barangay === options.scope);
        return ACCOMPLISHMENT_CATEGORIES.map((cat) => {
          const item = entry?.categoryData.find((c) => c.id === cat.id);
          const approved = item?.approved ?? 0;
          const denied = item?.denied ?? 0;
          const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
          return { label: cat.label, submitted, approved, denied };
        });
      })();

  drawAccomplishmentsSummaryTable(doc, y, accomplishmentSummary, MARGIN_LEFT, PRINTABLE_WIDTH);

  // ── PAGE 4: Barangay Compliance Rankings & Performance Matrix ───────
  if (options.sections.matrix) {
    doc.addPage();
    y = 36;
    y = drawSectionHeader(doc, y, 'V', 'Barangay Compliance Performance Ranking & Register', MARGIN_LEFT, PRINTABLE_WIDTH);

    if (options.sections.charts && chartRanking) {
      const rankCardH = 120;
      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        PRINTABLE_WIDTH,
        rankCardH,
        'Comparative Barangay Compliance Rates',
        chartRanking.dataUrl
      );
      y += rankCardH + 10;
    }

    y = drawComplianceMatrixTable(doc, y, options.compliance, options.scope, MARGIN_LEFT);
  }

  // ── PAGE 5: Detailed Submission Audit Trail ───────────
  if (options.sections.submissions) {
    doc.addPage();
    y = 36;
    y = drawSectionHeader(doc, y, 'VI', 'Detailed Submission Audit Log Archive', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawSubmissionsAuditTable(doc, y, options.submissions, MARGIN_LEFT, PRINTABLE_WIDTH, 100);
  }

  // Running footers
  addRunningHeadersAndFooters(doc, PAGE_WIDTH, PAGE_HEIGHT, PRINTABLE_WIDTH, MARGIN_LEFT);
};
