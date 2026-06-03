import type { MatrixCell, BarangayPerennialSummary } from '../hooks/useComplianceData';
import { SCHEDULED_TYPES, ASAP_TYPES, type HistoricalSubmission } from '../constants/submissionTypes';

// Helper to escape CSV values
const escapeCsv = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Helper to trigger browser download
const downloadCsv = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportBarangayProfileToCsv = (
  barangay: string,
  year: number,
  matrixData: MatrixCell[],
  summaries: BarangayPerennialSummary[]
) => {
  const rows: string[] = [];

  // 1. Header Section
  rows.push(escapeCsv(`BARANGAY COMPLIANCE PROFILE: ${barangay}`));
  rows.push(escapeCsv(`YEAR: ${year}`));
  rows.push(''); // blank row

  // Helper to find document label
  const getDocLabel = (id: string) => {
    const doc = [...SCHEDULED_TYPES, ...ASAP_TYPES].find((d) => d.id === id);
    return doc ? doc.label : id;
  };

  // 2. Scheduled & ASAP Documents Section
  rows.push(escapeCsv('--- SCHEDULED & ASAP DOCUMENTS ---'));
  rows.push(['Category', 'Document Type', 'Period', 'Status'].map(escapeCsv).join(','));

  // Filter matrix data for this barangay
  const brgyMatrix = matrixData.filter((c) => c.barangay === barangay);
  
  // Sort them so SCHEDULED comes first, then ASAP
  brgyMatrix.forEach((cell) => {
    const isAsap = cell.period === 'ASAP';
    const category = isAsap ? 'ASAP' : 'Scheduled';
    const docLabel = getDocLabel(cell.docType);
    rows.push(
      [
        category,
        docLabel,
        cell.period,
        cell.status,
      ].map(escapeCsv).join(',')
    );
  });
  rows.push(''); // blank row

  // 3. Year End Counts Section
  rows.push(escapeCsv('--- YEAR END COUNTS ---'));
  rows.push(['Document Type', 'Count'].map(escapeCsv).join(','));

  const summary = summaries.find((s) => s.barangay === barangay);
  if (summary) {
    rows.push(['Total Resolutions', summary.resolutions.toString()].map(escapeCsv).join(','));
    rows.push(['Total Accomplishment Reports', summary.accomplishmentsTotal.toString()].map(escapeCsv).join(','));
    summary.categoryData.forEach((cat) => {
      rows.push([cat.label, cat.count.toString()].map(escapeCsv).join(','));
    });
  }

  downloadCsv(rows.join('\n'), `Barangay_Profile_${barangay.replace(/\s+/g, '_')}_${year}.csv`);
};

export const exportSubmissionHistoryToCsv = (history: HistoricalSubmission[]) => {
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
    'Processed By'
  ];
  
  const rows = [headers.map(escapeCsv).join(',')];

  history.forEach((h) => {
    const submittedAt = h.submittedAt?.toDate ? h.submittedAt.toDate().toISOString() : '';
    const processedAt = h.status === 'approved' 
      ? (h.approvedAt?.toDate ? h.approvedAt.toDate().toISOString() : '') 
      : (h.deniedAt?.toDate ? h.deniedAt.toDate().toISOString() : '');
      
    const processedBy = h.status === 'approved' ? (h.approvedBy || '') : (h.deniedBy || '');

    rows.push(
      [
        h.id,
        h.barangay,
        h.fullName,
        h.documentLabel,
        h.period,
        h.year,
        h.status,
        submittedAt,
        processedAt,
        processedBy
      ].map(escapeCsv).join(',')
    );
  });

  downloadCsv(rows.join('\n'), `Submission_History_${new Date().toISOString().split('T')[0]}.csv`);
};
