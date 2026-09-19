import React, { useMemo, useState } from 'react';
import { Form } from 'react-bootstrap';
import { BARANGAYS } from '../../constants/barangays';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  ALL_UPLOAD_TYPES,
  type PendingSubmission,
  type HistoricalSubmission,
} from '../../constants/submissionTypes';
import { useComplianceData } from '../../hooks/useComplianceData';
import { formatPeriodLabel } from '../../utils/periodUtils';
import { exportAnalyticsSummaryCsv } from '../../utils/csvUtils';
import YearEndReports from './YearEndReports';

/* ─────────────────────────────────────────────
   Matrix status chip config
───────────────────────────────────────────── */
const matrixChipConfig: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'matrix-chip-approved', label: '✓ Done'    },
  pending:  { cls: 'matrix-chip-pending',  label: '⏳ Review' },
  missing:  { cls: 'matrix-chip-missing',  label: '✗ Missing' },
  not_due:  { cls: 'matrix-chip-not-due',  label: '— —'       },
};

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface ComplianceMatrixProps {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({
  pending = [],
  history = [],
}) => {
  const currentYear = new Date().getFullYear();

  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [matrixDocType, setMatrixDocType] = useState(ALL_UPLOAD_TYPES[0]?.id || '');

  const approved = useMemo(
    () => history.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [history],
  );

  const activeBarangays = useMemo(
    () => (selectedBarangay ? [selectedBarangay] : BARANGAYS),
    [selectedBarangay],
  );

  const filteredPending = useMemo(
    () => (selectedBarangay ? pending.filter((s) => s.barangay === selectedBarangay) : pending),
    [pending, selectedBarangay],
  );

  const compliance = useComplianceData(currentYear, filteredPending, approved, activeBarangays);

  const matrixForDocType = useMemo(() => {
    const cells = compliance.matrixData.filter((c) => c.docType === matrixDocType);
    const periods = [...new Set(cells.map((c) => c.period))];
    return { cells, periods };
  }, [compliance.matrixData, matrixDocType]);

  /* Legend counts for summary pills */
  const summaryCounts = useMemo(() => {
    const counts = { approved: 0, pending: 0, missing: 0, not_due: 0 };
    matrixForDocType.cells.forEach((c) => { counts[c.status]++; });
    return counts;
  }, [matrixForDocType.cells]);

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="barangay-filter-card mb-4">
        {/* Desktop View (≥768px): Single line bar */}
        <div className="bfc-desktop-row">
          <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}
            >
              filter_alt
            </span>
            <span className="bfc-header-title" style={{ whiteSpace: 'nowrap' }}>
              Filter by Barangay
            </span>
          </div>
          <Form.Select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="bfc-select"
            style={{ maxWidth: '280px' }}
          >
            <option value="">All Barangays</option>
            {BARANGAYS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Form.Select>
          {selectedBarangay && (
            <button type="button" className="bfc-btn-clear" onClick={() => setSelectedBarangay('')}>
              ✕ Clear filter
            </button>
          )}
          <div className="ms-auto">
            <button
              type="button"
              className="bfc-btn-export"
              onClick={() => exportAnalyticsSummaryCsv(currentYear, selectedBarangay || 'all', compliance)}
              title={selectedBarangay ? `Export ${selectedBarangay} Profile CSV` : "Export Municipal Compliance & Matrix CSV for All Barangays"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              {selectedBarangay ? 'Export Barangay Profile CSV' : 'Export All Barangays CSV'}
            </button>
          </div>
        </div>

        {/* Mobile View (<768px): Consistent fixed 3-row layout */}
        <div className="bfc-mobile-container">
          {/* Row 1: Header */}
          <div className="bfc-header">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}
            >
              filter_alt
            </span>
            <span className="bfc-header-title">Filter by Barangay</span>
          </div>

          {/* Row 2: Select Dropdown (100% full width) */}
          <Form.Select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="bfc-select w-100"
          >
            <option value="">All Barangays</option>
            {BARANGAYS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Form.Select>

          {/* Row 3: Action Buttons */}
          <div className="bfc-actions">
            <div>
              {selectedBarangay ? (
                <button type="button" className="bfc-btn-clear" onClick={() => setSelectedBarangay('')}>
                  ✕ Clear filter
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="bfc-btn-export"
              onClick={() => exportAnalyticsSummaryCsv(currentYear, selectedBarangay || 'all', compliance)}
              title={selectedBarangay ? `Export ${selectedBarangay} Profile CSV` : "Export Municipal Compliance & Matrix CSV for All Barangays"}
            >
              <span className="material-symbols-outlined">download</span>
              {selectedBarangay ? 'Export Barangay Profile CSV' : 'Export All Barangays CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Matrix Card ── */}
      <div className="analytics-card" style={{ maxWidth: '100%' }}>
        <div className="chart-card-header chart-header-primary">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="chart-card-title">
                <span className="material-symbols-outlined icon-matrix" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1", marginRight: '8px' }}>
                  grid_on
                </span>
                Compliance Matrix
              </p>
              <p className="chart-card-subtitle">
                Barangay × Period status for selected document type
              </p>
            </div>
            <Form.Select
              value={matrixDocType}
              onChange={(e) => setMatrixDocType(e.target.value)}
              style={{ maxWidth: '320px', fontSize: '13px' }}
            >
              <optgroup label="Scheduled Documents">
                {SCHEDULED_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </optgroup>
              <optgroup label="ASAP Documents">
                {ASAP_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>{dt.label}</option>
                ))}
              </optgroup>
            </Form.Select>
          </div>
        </div>

        <div className="p-4">
          {/* Summary pills */}
          <div className="d-flex gap-3 mb-3 flex-wrap" style={{ fontSize: '12px' }}>
            {(Object.entries(matrixChipConfig) as [string, { cls: string; label: string }][])
              .filter(([key]) => key !== 'not_due')
              .map(([key, cfg]) => (
                <span key={key} className={`matrix-chip ${cfg.cls}`}>
                  {cfg.label}
                  <span
                    style={{
                      marginLeft: '6px',
                      background: 'rgba(0,0,0,0.08)',
                      borderRadius: '9999px',
                      padding: '0 6px',
                      fontWeight: 700,
                    }}
                  >
                    {summaryCounts[key as keyof typeof summaryCounts]}
                  </span>
                </span>
              ))}
          </div>

          {/* Table */}
          <div
            className="table-responsive"
            style={{ maxHeight: '260px', overflowY: 'auto', overflowX: 'auto', width: '100%', maxWidth: '100%' }}
          >
            <table className="table table-sm table-hover mb-0" style={{ fontSize: '12px' }}>
              <thead className="sticky-top bg-white">
                <tr>
                  <th style={{ minWidth: '170px' }}>Barangay</th>
                  {matrixForDocType.periods.map((p) => (
                    <th key={p} className="text-center" style={{ minWidth: '90px' }}>
                      {p === 'ASAP' ? 'Status' : formatPeriodLabel(p).replace(` ${currentYear}`, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeBarangays.map((brgy) => (
                  <tr key={brgy}>
                    <td className="fw-semibold text-truncate" style={{ maxWidth: '180px', color: '#18181B' }}>{brgy}</td>
                    {matrixForDocType.periods.map((period) => {
                      const cell = matrixForDocType.cells.find(
                        (c) => c.barangay === brgy && c.period === period,
                      );
                      const status = cell?.status || 'not_due';
                      const cfg = matrixChipConfig[status] || matrixChipConfig.not_due;
                      return (
                        <td
                          key={period}
                          className="text-center"
                          title={`${brgy} — ${period === 'ASAP' ? 'ASAP' : formatPeriodLabel(period)}: ${status}`}
                        >
                          <span className={`matrix-chip ${cfg.cls}`}>{cfg.label}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Year-End Reports ── */}
      {selectedBarangay && (
        <div
          style={{
            borderTop: '2px solid #E4E4E7',
            marginTop: '28px',
            paddingTop: '28px',
          }}
        >
          <YearEndReports pending={pending} history={history} selectedBarangay={selectedBarangay} />
        </div>
      )}
    </>
  );
};

export default ComplianceMatrix;
