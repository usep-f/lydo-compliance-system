import type {
  MatrixCell,
  BarangayPerennialSummary,
  ComplianceData,
  BarangayCompliance,
} from '../hooks/useComplianceData';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  ACCOMPLISHMENT_CATEGORIES,
  type HistoricalSubmission,
  type PendingSubmission,
} from '../constants/submissionTypes';

/** Helper to escape CSV values according to RFC 4180 standard */
export const escapeCsv = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/** Helper to trigger browser download of CSV content */
export const downloadCsv = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Helper to find human-readable document label */
const getDocLabel = (id: string): string => {
  const doc = [...SCHEDULED_TYPES, ...ASAP_TYPES].find((d) => d.id === id);
  return doc ? doc.label : id;
};

/** Helper to format Firestore timestamp or string date safely */
const formatCsvDate = (val: unknown): string => {
  if (!val) return '';
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    const ts = val as { toDate: () => Date };
    return ts.toDate().toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  return String(val);
};

/** Build a single row for all-barangays comparative analytics table */
const buildBarangaySummaryRow = (
  b: BarangayCompliance,
  perennialSummary: BarangayPerennialSummary[]
): string => {
  const summary = perennialSummary.find((s) => s.barangay === b.barangay);
  const resolutions = summary?.resolutions ?? 0;
  const totalAcc = summary?.accomplishmentsTotal ?? 0;

  const catCounts = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
    const item = summary?.categoryData.find((c) => c.id === cat.id);
    return item ? item.count : 0;
  });

  const cols = [
    b.barangay,
    `${b.rate}%`,
    b.expected,
    b.approved,
    b.expected - b.approved > 0 ? b.expected - b.approved : 0,
    resolutions,
    totalAcc,
    ...catCounts,
  ];
  return cols.map(escapeCsv).join(',');
};

/** Builds CSV rows for municipal-wide analytics summary */
const buildAllBarangaysRows = (
  year: number,
  compliance: ComplianceData
): string[] => {
  const rows: string[] = [
    escapeCsv(`LYDO MUNICIPAL COMPLIANCE & ANALYTICS SUMMARY`),
    escapeCsv(`CALENDAR YEAR: ${year}`),
    escapeCsv(`OVERALL COMPLIANCE RATE: ${compliance.overallRate}%`),
    escapeCsv(`FULLY COMPLIANT BARANGAYS: ${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`),
    '',
    [
      'Barangay',
      'Compliance Rate',
      'Expected Scheduled Docs',
      'Approved Docs',
      'Missing / Overdue Docs',
      'Total Resolutions',
      'Total Accomplishment Reports',
      ...ACCOMPLISHMENT_CATEGORIES.map((c) => c.label),
    ].map(escapeCsv).join(','),
  ];

  compliance.barangayRanking.forEach((b) => {
    rows.push(buildBarangaySummaryRow(b, compliance.barangayPerennialSummary));
  });

  return rows;
};

/** Builds CSV rows for a specific barangay dossier profile */
const buildSingleBarangayRows = (
  barangay: string,
  year: number,
  compliance: ComplianceData
): string[] => {
  const bData = compliance.barangayRanking.find((b) => b.barangay === barangay);
  const rows: string[] = [
    escapeCsv(`BARANGAY COMPLIANCE PROFILE: ${barangay.toUpperCase()}`),
    escapeCsv(`CALENDAR YEAR: ${year}`),
    escapeCsv(`COMPLIANCE RATE: ${bData?.rate ?? 0}%`),
    '',
    escapeCsv('--- SCHEDULED & ASAP DOCUMENTS ---'),
    ['Category', 'Document Type', 'Period', 'Status'].map(escapeCsv).join(','),
  ];

  compliance.matrixData
    .filter((c) => c.barangay === barangay)
    .forEach((cell) => {
      const category = cell.period === 'ASAP' ? 'ASAP' : 'Scheduled';
      rows.push([category, getDocLabel(cell.docType), cell.period, cell.status].map(escapeCsv).join(','));
    });

  rows.push('', escapeCsv('--- PERENNIAL COUNTS & CATEGORY BREAKDOWN ---'), ['Metric / Category', 'Count'].map(escapeCsv).join(','));

  const summary = compliance.barangayPerennialSummary.find((s) => s.barangay === barangay);
  if (summary) {
    rows.push(['Total Resolutions', String(summary.resolutions)].map(escapeCsv).join(','));
    rows.push(['Total Accomplishment Reports', String(summary.accomplishmentsTotal)].map(escapeCsv).join(','));
    summary.categoryData.forEach((cat) => {
      rows.push([cat.label, String(cat.count)].map(escapeCsv).join(','));
    });
  }

  return rows;
};

/** Export Analytics Summary CSV (All Barangays or Specific Barangay) */
export const exportAnalyticsSummaryCsv = (
  year: number,
  scope: string,
  compliance: ComplianceData
): void => {
  const isAll = scope === 'all' || !scope;
  const rows = isAll
    ? buildAllBarangaysRows(year, compliance)
    : buildSingleBarangayRows(scope, year, compliance);

  const cleanScope = isAll ? 'All_Barangays' : scope.replace(/\s+/g, '_');
  const filename = `LYDO_Analytics_Summary_${cleanScope}_${year}.csv`;
  downloadCsv(rows.join('\n'), filename);
};

/** Builds a single CSV row from a submission document */
const buildSubmissionCsvRow = (
  s: HistoricalSubmission | PendingSubmission
): string => {
  const isHist = 'status' in s && s.status !== 'pending';
  const hist = isHist ? (s as HistoricalSubmission) : null;
  const submittedAt = formatCsvDate(s.submittedAt);
  const processedAt = hist ? formatCsvDate(hist.approvedAt || hist.deniedAt) : '';
  const processedBy = hist ? (hist.approvedBy || hist.deniedBy || '') : '';
  const reviewNotes = hist?.reviewNotes || '';

  const anySub = s as unknown as { status?: string; approvedAt?: unknown; deniedAt?: unknown };
  const rawStatus = anySub.status || (anySub.approvedAt ? 'approved' : anySub.deniedAt ? 'denied' : 'pending');

  return [
    s.id,
    s.barangay,
    s.fullName,
    s.documentLabel,
    s.period,
    String(s.year),
    rawStatus,
    submittedAt,
    processedAt,
    processedBy,
    reviewNotes,
  ].map(escapeCsv).join(',');
};

/** Export filtered submission records to CSV */
export const exportFilteredSubmissionsCsv = (
  submissions: (HistoricalSubmission | PendingSubmission)[],
  filenameSuffix = 'Logs'
): void => {
  const headers = [
    'Submission ID',
    'Barangay',
    'Submitted By',
    'Document Type',
    'Period',
    'Year',
    'Status',
    'Submitted At',
    'Processed At',
    'Processed By',
    'Review Notes / Denial Reason',
  ].map(escapeCsv).join(',');

  const rows = [headers, ...submissions.map(buildSubmissionCsvRow)];
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsv(rows.join('\n'), `LYDO_Submissions_${filenameSuffix}_${dateStr}.csv`);
};

// ---------------------------------------------------------------------------
// Backwards Compatibility Wrappers
// ---------------------------------------------------------------------------

export const exportBarangayProfileToCsv = (
  barangay: string,
  year: number,
  matrixData: MatrixCell[],
  summaries: BarangayPerennialSummary[]
): void => {
  const dummyCompliance: ComplianceData = {
    overallRate: 0,
    fullyCompliantCount: 0,
    totalBarangays: 0,
    overdueCount: 0,
    pendingReviewCount: 0,
    barangayRanking: [],
    docTypeCompliance: [],
    monthlyTrend: [],
    matrixData,
    asapStatus: [],
    barangayPerennialSummary: summaries,
  };
  exportAnalyticsSummaryCsv(year, barangay, dummyCompliance);
};

export const exportSubmissionHistoryToCsv = (
  history: HistoricalSubmission[]
): void => {
  exportFilteredSubmissionsCsv(history, 'History');
};
