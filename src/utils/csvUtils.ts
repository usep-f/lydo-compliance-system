import type { MatrixCell, BarangayCompliance } from '../hooks/useComplianceData';
import type { HistoricalSubmission } from '../constants/submissionTypes';

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

export const exportComplianceMatrixToCsv = (
  cells: MatrixCell[],
  barangays: string[],
  periods: string[],
  docTypeName: string
) => {
  const headers = ['Barangay', ...periods];
  const rows = [headers.map(escapeCsv).join(',')];

  barangays.forEach((barangay) => {
    const row = [escapeCsv(barangay)];
    periods.forEach((period) => {
      const cell = cells.find((c) => c.barangay === barangay && c.period === period);
      row.push(escapeCsv(cell?.status || 'not_due'));
    });
    rows.push(row.join(','));
  });

  downloadCsv(rows.join('\n'), `Compliance_Matrix_${docTypeName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportBarangayRankingsToCsv = (rankings: BarangayCompliance[]) => {
  const headers = ['Rank', 'Barangay', 'Approved', 'Expected', 'Compliance Rate (%)'];
  const rows = [headers.map(escapeCsv).join(',')];

  rankings.forEach((r, index) => {
    rows.push(
      [
        index + 1,
        r.barangay,
        r.approved,
        r.expected,
        r.rate,
      ].map(escapeCsv).join(',')
    );
  });

  downloadCsv(rows.join('\n'), `Barangay_Rankings_${new Date().toISOString().split('T')[0]}.csv`);
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
