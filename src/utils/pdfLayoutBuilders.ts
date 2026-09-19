import type jsPDF from 'jspdf';
import type { ComplianceData } from '../hooks/useComplianceData';
import {
  drawComplianceMatrixTable,
  drawDenialBreakdownTable,
  drawAccomplishmentsSummaryTable,
  drawSubmissionsAuditTable,
} from './pdfTableBuilders';
import { ACCOMPLISHMENT_CATEGORIES } from '../constants/submissionTypes';
import { PAPER_GEOMETRIES, type PdfReportOptions } from './pdfReportUtils';

/* ─────────────────────────────────────────────
   Executive Palette & Geometry Constants (Option B - Modern Minimalist Slate & Neon)
───────────────────────────────────────────── */
const COLORS = {
  primaryNavy: [0, 66, 110] as [number, number, number],  // LYDO Deep Navy #00426E
  cobaltBlue: [37, 99, 235] as [number, number, number],  // Vibrant Cobalt #2563EB
  darkSlate: [15, 23, 42] as [number, number, number],    // Slate 900 #0F172A
  textMuted: [100, 116, 139] as [number, number, number], // Slate 500 #64748B
  textSubtle: [148, 163, 184] as [number, number, number],// Slate 400 #94A3B8
  cardBg: [255, 255, 255] as [number, number, number],
  headerBg: [248, 250, 252] as [number, number, number],  // Slate 50 #F8FAFC
  cardBorder: [226, 232, 240] as [number, number, number],// Slate 200 #E2E8F0
  ruleColor: [226, 232, 240] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],    // Electric Mint #10B981
  amber: [245, 158, 11] as [number, number, number],       // Bright Amber #F59E0B
  rose: [225, 29, 72] as [number, number, number],         // Neon Coral #E11D48
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

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
  // Primary brand accent pill
  doc.setFillColor(...COLORS.cobaltBlue);
  doc.roundedRect(marginLeft, y - 8, 3.5, 11, 1, 1, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.darkSlate);
  const heading = `${sectionNumber}. ${sectionTitle.toUpperCase()}`;
  doc.text(heading, marginLeft + 9, y);

  // Subtle trailing rule line
  doc.setDrawColor(...COLORS.ruleColor);
  doc.setLineWidth(0.4);
  const textWidth = doc.getTextWidth(heading);
  doc.line(marginLeft + 12 + textWidth, y - 3, marginLeft + printableWidth, y - 3);

  return y + 9;
};

/* ─────────────────────────────────────────────
   Official Header & Branding (Page 1)
───────────────────────────────────────────── */
export const drawOfficialHeader = (
  doc: jsPDF,
  scope: string,
  year: number,
  pageWidth: number,
  printableWidth: number,
  marginLeft: number,
  logoDataUrl?: string | null
): number => {
  const isAll = scope === 'all' || !scope;
  const scopeLabel = isAll ? 'All Registered Barangays' : `Barangay ${scope}`;

  // 1. Centered Official Seal Logo
  const logoSize = 40;
  const logoX = (pageWidth - logoSize) / 2;
  const logoY = 16;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      doc.setFillColor(...COLORS.primaryNavy);
      doc.circle(pageWidth / 2, logoY + (logoSize / 2), logoSize / 2, 'F');
    }
  }

  // 2. Primary Official Organization Title
  const titleY = logoY + logoSize + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primaryNavy);
  doc.text('LUCENA CITY YOUTH DEVELOPMENT OFFICE', pageWidth / 2, titleY, { align: 'center' });

  // 3. Document Subtitle
  const subY = titleY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.cobaltBlue);
  doc.text('EXECUTIVE COMPLIANCE REPORT', pageWidth / 2, subY, { align: 'center' });

  // 4. Compact Contextual Metadata Caption
  const metaY = subY + 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `Jurisdiction: ${scopeLabel}   |   Statutory Period: Calendar Year ${year}   |   Date Generated: ${formatReportDate()}`,
    pageWidth / 2,
    metaY,
    { align: 'center' }
  );

  // 5. Clean Divider Double Line
  const lineY = metaY + 8;
  doc.setDrawColor(...COLORS.primaryNavy);
  doc.setLineWidth(1);
  doc.line(marginLeft, lineY, marginLeft + printableWidth, lineY);

  doc.setDrawColor(...COLORS.ruleColor);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, lineY + 2, marginLeft + printableWidth, lineY + 2);

  return lineY + 10;
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
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');

  // Top colored accent strip
  doc.setFillColor(...accentColor);
  doc.roundedRect(x, y, w, 3, 1, 1, 'F');

  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(label.toUpperCase(), x + 8, y + 13);

  // Big Metric Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(value, x + 8, y + 28);

  // Subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSubtle);
  doc.text(subtext, x + 8, y + 38);
};

export const drawKpiScorecard = (
  doc: jsPDF,
  startY: number,
  compliance: ComplianceData,
  scope: string,
  printableWidth: number,
  marginLeft: number,
  includeDenials = true
): number => {
  const isAll = scope === 'all' || !scope;
  const bData = !isAll ? compliance.barangayRanking.find((b) => b.barangay === scope) : null;
  const rateStr = isAll ? `${compliance.overallRate}%` : `${bData?.rate ?? 0}%`;
  const totalDenied = compliance.denialReasonShare.reduce((acc, d) => acc + d.count, 0);

  const count = includeDenials ? 5 : 4;
  const gap = 10;
  const cardW = (printableWidth - (gap * (count - 1))) / count;
  const cardH = 44;

  let x = marginLeft;
  drawExecutiveKpiCard(doc, x, startY, cardW, cardH, 'Overall Compliance', rateStr, 'Municipal statutory rate', [37, 99, 235]);
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
      [100, 116, 139]
    );
  }

  return startY + cardH + 10;
};

/* ─────────────────────────────────────────────
   Running Footers
───────────────────────────────────────────── */
export const addRunningHeadersAndFooters = (
  doc: jsPDF,
  _pageWidth: number,
  pageHeight: number,
  printableWidth: number,
  marginLeft: number
): void => {
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running bottom divider line
    doc.setDrawColor(...COLORS.ruleColor);
    doc.setLineWidth(0.4);
    doc.line(marginLeft, pageHeight - 20, marginLeft + printableWidth, pageHeight - 20);

    // Left confidentiality notice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Confidential Official Government Record — For Internal & Regulatory Use Only', marginLeft, pageHeight - 11);

    // Right page number
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${i} of ${totalPages}`, marginLeft + printableWidth, pageHeight - 11, { align: 'right' });
  }
};

/* ─────────────────────────────────────────────
   High-Fidelity Visual Chart Cards (Landscape Panoramic)
───────────────────────────────────────────── */

/**
 * Draws an executive card container for wide high-DPI bar/line/gauge/donut charts
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
  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.cardBorder);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

  // Header Bar
  doc.setFillColor(...COLORS.headerBg);
  doc.roundedRect(cardX, cardY, cardW, 20, 4, 4, 'F');
  doc.setDrawColor(...COLORS.cardBorder);
  doc.line(cardX, cardY + 20, cardX + cardW, cardY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.darkSlate);
  doc.text(title, cardX + 10, cardY + 13.5);

  const availW = cardW - 12;
  const availH = cardH - 26;

  try {
    doc.addImage(dataUrl, 'PNG', cardX + 6, cardY + 23, availW, availH);
  } catch (e) {
    console.error('Error drawing chart card:', e);
  }
};

export const drawCircularDonutChart = (
  doc: jsPDF,
  cardX: number,
  cardY: number,
  cardW: number,
  cardH: number,
  title: string,
  dataUrl: string
): void => {
  drawStandardChartCard(doc, cardX, cardY, cardW, cardH, title, dataUrl);
};

/* ─────────────────────────────────────────────
   Primary Layout Orchestrator: Full Audit Dossier (Landscape Horizontal Mode)
───────────────────────────────────────────── */

export const buildAuditDossierLayout = (doc: jsPDF, options: PdfReportOptions): void => {
  const paperKey = options.paperSize || 'legal';
  const geometry = PAPER_GEOMETRIES[paperKey] || PAPER_GEOMETRIES.legal;
  // Landscape dimensions (Width = 936 pt, Height = 612 pt on Philippine Legal)
  const PAGE_WIDTH = geometry.height;
  const PAGE_HEIGHT = geometry.width;
  const MARGIN_LEFT = 36;
  const PRINTABLE_WIDTH = PAGE_WIDTH - (MARGIN_LEFT * 2);
  const cardGap = 16;
  const halfW = (PRINTABLE_WIDTH - cardGap) / 2;

  const chartList = options.charts || [];
  const findChart = (keyword: string) =>
    chartList.find((c) => c.title.toLowerCase().includes(keyword.toLowerCase()));

  const chartOverall = findChart('overall compliance') || findChart('distribution') || chartList[0];
  const chartTimeline = findChart('timeline') || findChart('activity') || chartList[1];
  const chartDocType = findChart('document type') || chartList[2];
  const chartDenial = findChart('denial') || chartList[3];
  const chartYouthAcc = findChart('youth accomplishment') || chartList[4];
  const chartAccPie = findChart('accomplishment report category') || findChart('accomplishment share') || chartList[5];

  const isAll = options.scope === 'all' || !options.scope;
  const totalDenied = options.compliance.denialReasonShare.reduce((s, d) => s + d.count, 0);
  const topDenial = options.compliance.denialReasonShare[0];

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 1: OFFICIAL BRANDING, KPIS & PANORAMIC MACRO CHARTS
  // ═════════════════════════════════════════════════════════════════════════
  let y = drawOfficialHeader(doc, options.scope, options.year, PAGE_WIDTH, PRINTABLE_WIDTH, MARGIN_LEFT, options.logoDataUrl);

  if (options.sections.kpis) {
    y = drawSectionHeader(doc, y, 'I', 'Executive KPI Scorecard & Volume Audit', MARGIN_LEFT, PRINTABLE_WIDTH);
    y = drawKpiScorecard(doc, y, options.compliance, options.scope, PRINTABLE_WIDTH, MARGIN_LEFT, true);
  }

  if (options.sections.charts && chartOverall && chartTimeline) {
    y = drawSectionHeader(doc, y, 'II', 'Macro Compliance & Annual Submission Activity', MARGIN_LEFT, PRINTABLE_WIDTH);
    const chartCardH = 340;

    drawCircularDonutChart(
      doc,
      MARGIN_LEFT,
      y,
      halfW,
      chartCardH,
      'Overall Compliance Status Distribution',
      chartOverall.dataUrl
    );

    drawStandardChartCard(
      doc,
      MARGIN_LEFT + halfW + cardGap,
      y,
      halfW,
      chartCardH,
      'Annual Submission Activity Timeline (12 Months)',
      chartTimeline.dataUrl
    );

    y += chartCardH + 8;

    // Page 1 Governance Bottleneck Finding Banner
    if (topDenial && topDenial.count > 0) {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(MARGIN_LEFT, y, PRINTABLE_WIDTH, 26, 3, 3, 'FD');

      doc.setFillColor(225, 29, 72);
      doc.roundedRect(MARGIN_LEFT, y, 3.5, 26, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(159, 18, 57);
      doc.text('PRIMARY GOVERNANCE BOTTLENECK DETECTED (MUNICIPAL AUDIT FINDING):', MARGIN_LEFT + 10, y + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.darkSlate);
      doc.text(
        `Leading cause of rejection across filings: "${topDenial.label}" accounting for ${topDenial.percentage}% of all denials (${topDenial.count} filings returned).`,
        MARGIN_LEFT + 10,
        y + 20
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 2: CATEGORICAL DOCUMENT BREAKDOWN & DENIAL AUDIT
  // ═════════════════════════════════════════════════════════════════════════
  if (options.sections.charts && (chartDocType || chartDenial)) {
    doc.addPage();
    y = 30;
    y = drawSectionHeader(doc, y, 'III', 'Document Type Compliance & Rejection Audit', MARGIN_LEFT, PRINTABLE_WIDTH);

    const cardH = 270;
    if (chartDocType && chartDenial) {
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
        MARGIN_LEFT + halfW + cardGap,
        y,
        halfW,
        cardH,
        'Categorical Denial Reason Share',
        chartDenial.dataUrl
      );

      y += cardH + 12;
    }

    // Denial Breakdown Data Table
    y = drawSectionHeader(doc, y, 'III.A', 'Categorical Rejection Register & Deficiency Log', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawDenialBreakdownTable(doc, y, options.compliance.denialReasonShare, totalDenied, MARGIN_LEFT, PRINTABLE_WIDTH);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 3: YOUTH DEVELOPMENT PRIORITIES (10 STATUTORY AREAS)
  // ═════════════════════════════════════════════════════════════════════════
  if (options.sections.charts && (chartYouthAcc || chartAccPie)) {
    doc.addPage();
    y = 30;
    y = drawSectionHeader(doc, y, 'IV', 'Youth Development Accomplishment Filings (10 Statutory Areas)', MARGIN_LEFT, PRINTABLE_WIDTH);

    const cardH = 265;
    if (chartYouthAcc && chartAccPie) {
      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        halfW,
        cardH,
        'Accomplishment Filings by Priority Area (10 Areas)',
        chartYouthAcc.dataUrl
      );

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT + halfW + cardGap,
        y,
        halfW,
        cardH,
        'Approved Accomplishment Share',
        chartAccPie.dataUrl
      );

      y += cardH + 14;
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
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PAGE 4+: STATUTORY COMPLIANCE MATRIX REGISTER & AUDIT LOGS
  // ═════════════════════════════════════════════════════════════════════════
  if (options.sections.matrix) {
    doc.addPage();
    y = 30;
    drawSectionHeader(doc, y, 'V', 'Statutory Barangay Compliance Matrix Register', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawComplianceMatrixTable(doc, y + 9, options.compliance, options.scope, MARGIN_LEFT, PRINTABLE_WIDTH);
  }

  if (options.sections.submissions) {
    doc.addPage();
    y = 30;
    drawSectionHeader(doc, y, 'VI', 'Detailed Statutory Submission Audit Log Archive', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawSubmissionsAuditTable(doc, y + 9, options.submissions, MARGIN_LEFT, PRINTABLE_WIDTH, 100);
  }

  // Running footers across all pages
  addRunningHeadersAndFooters(doc, PAGE_WIDTH, PAGE_HEIGHT, PRINTABLE_WIDTH, MARGIN_LEFT);
};

/* ─────────────────────────────────────────────
   Secondary Layout: Executive Brief (Portrait Compatibility)
───────────────────────────────────────────── */

export const buildExecutiveBriefLayout = (doc: jsPDF, options: PdfReportOptions): void => {
  // If user explicitly chooses portrait, delegate with portrait bounds
  const paperKey = options.paperSize || 'legal';
  const geometry = PAPER_GEOMETRIES[paperKey] || PAPER_GEOMETRIES.legal;
  const PAGE_WIDTH = geometry.width;
  const PAGE_HEIGHT = geometry.height;
  const MARGIN_LEFT = 36;
  const PRINTABLE_WIDTH = PAGE_WIDTH - (MARGIN_LEFT * 2);

  const chartList = options.charts || [];
  const findChart = (keyword: string) =>
    chartList.find((c) => c.title.toLowerCase().includes(keyword.toLowerCase()));

  const chartOverall = findChart('overall compliance') || findChart('distribution') || chartList[0];
  const chartTimeline = findChart('timeline') || findChart('activity') || chartList[1];
  const chartDocType = findChart('document type') || chartList[2];
  const chartDenial = findChart('denial') || chartList[3];
  const chartYouthAcc = findChart('youth accomplishment') || chartList[4];
  const chartAccPie = findChart('accomplishment report category') || findChart('accomplishment share') || chartList[5];

  const isAll = options.scope === 'all' || !options.scope;
  const totalDenied = options.compliance.denialReasonShare.reduce((acc, d) => acc + d.count, 0);
  const topDenial = options.compliance.denialReasonShare[0];

  // Page 1: Header, KPIs, Macro Charts
  let y = drawOfficialHeader(doc, options.scope, options.year, PAGE_WIDTH, PRINTABLE_WIDTH, MARGIN_LEFT, options.logoDataUrl);

  if (options.sections.kpis) {
    y = drawSectionHeader(doc, y, 'I', 'Executive Compliance Scorecard', MARGIN_LEFT, PRINTABLE_WIDTH);
    y = drawKpiScorecard(doc, y, options.compliance, options.scope, PRINTABLE_WIDTH, MARGIN_LEFT, false);
  }

  if (options.sections.charts && chartOverall && chartTimeline) {
    y = drawSectionHeader(doc, y, 'II', 'Statutory Compliance Status & Submission Activity', MARGIN_LEFT, PRINTABLE_WIDTH);
    const macroCardH = 260;
    const gaugeW = 230;
    const timelineW = PRINTABLE_WIDTH - gaugeW - 12;

    drawCircularDonutChart(
      doc,
      MARGIN_LEFT,
      y,
      gaugeW,
      macroCardH,
      'Compliance Status Gauge',
      chartOverall.dataUrl
    );

    drawStandardChartCard(
      doc,
      MARGIN_LEFT + gaugeW + 12,
      y,
      timelineW,
      macroCardH,
      'Annual Submission Activity Timeline',
      chartTimeline.dataUrl
    );

    y += macroCardH + 12;

    if (topDenial && topDenial.count > 0) {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(MARGIN_LEFT, y, PRINTABLE_WIDTH, 30, 4, 4, 'FD');

      doc.setFillColor(225, 29, 72);
      doc.roundedRect(MARGIN_LEFT, y, 4, 30, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(159, 18, 57);
      doc.text('PRIMARY GOVERNANCE BOTTLENECK DETECTED (MUNICIPAL AUDIT FINDING):', MARGIN_LEFT + 12, y + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.darkSlate);
      doc.text(
        `Leading cause of rejection across filings: "${topDenial.label}" accounting for ${topDenial.percentage}% of all denials (${topDenial.count} filings returned).`,
        MARGIN_LEFT + 12,
        y + 22
      );
    }
  }

  // Page 2: Document Type Compliance Breakdown
  if (options.sections.charts && (chartDocType || chartDenial)) {
    doc.addPage();
    y = 36;
    y = drawSectionHeader(doc, y, 'III', 'Document Type Compliance & Rejection Audit', MARGIN_LEFT, PRINTABLE_WIDTH);

    const rowH = 240;
    const halfW = (PRINTABLE_WIDTH - 12) / 2;

    if (chartDocType && chartDenial) {
      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        halfW,
        rowH,
        'Document Type Compliance Breakdown',
        chartDocType.dataUrl
      );

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT + halfW + 12,
        y,
        halfW,
        rowH,
        'Categorical Denial Reason Share',
        chartDenial.dataUrl
      );

      y += rowH + 12;
    }

    y = drawSectionHeader(doc, y, 'III.A', 'Categorical Rejection Register & Deficiency Log', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawDenialBreakdownTable(doc, y, options.compliance.denialReasonShare, totalDenied, MARGIN_LEFT, PRINTABLE_WIDTH);
  }

  // Page 3: Youth Development Accomplishments
  if (options.sections.charts && (chartYouthAcc || chartAccPie)) {
    doc.addPage();
    y = 36;
    y = drawSectionHeader(doc, y, 'IV', 'Youth Development Accomplishments (10 Statutory Areas)', MARGIN_LEFT, PRINTABLE_WIDTH);

    const rowH = 240;
    const halfW = (PRINTABLE_WIDTH - 12) / 2;

    if (chartYouthAcc && chartAccPie) {
      drawStandardChartCard(
        doc,
        MARGIN_LEFT,
        y,
        halfW,
        rowH,
        'Accomplishment Filings by Area (10 Areas)',
        chartYouthAcc.dataUrl
      );

      drawCircularDonutChart(
        doc,
        MARGIN_LEFT + halfW + 12,
        y,
        halfW,
        rowH,
        'Approved Accomplishment Share',
        chartAccPie.dataUrl
      );

      y += rowH + 12;
    }

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
  }

  // Page 4+: Tables
  if (options.sections.matrix) {
    doc.addPage();
    y = 36;
    drawSectionHeader(doc, y, 'V', 'Statutory Barangay Compliance Matrix Register', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawComplianceMatrixTable(doc, y + 9, options.compliance, options.scope, MARGIN_LEFT, PRINTABLE_WIDTH);
  }

  if (options.sections.submissions) {
    doc.addPage();
    y = 36;
    drawSectionHeader(doc, y, 'VI', 'Detailed Statutory Submission Audit Log Archive', MARGIN_LEFT, PRINTABLE_WIDTH);
    drawSubmissionsAuditTable(doc, y + 9, options.submissions, MARGIN_LEFT, PRINTABLE_WIDTH, 100);
  }

  addRunningHeadersAndFooters(doc, PAGE_WIDTH, PAGE_HEIGHT, PRINTABLE_WIDTH, MARGIN_LEFT);
};
