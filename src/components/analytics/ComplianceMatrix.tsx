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
import { exportBarangayProfileToCsv } from '../../utils/csvUtils';
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
      <div
        className="mb-4 d-flex align-items-center gap-3 flex-wrap p-3"
        style={{ background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '12px', maxWidth: '100%' }}
      >
        {/* Barangay filter */}
        <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: '#4F46E5', fontVariationSettings: "'FILL' 1" }}
          >
            filter_alt
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#3F3F46', fontFamily: 'var(--font-headline)', whiteSpace: 'nowrap' }}>
            Filter by Barangay
          </span>
        </div>
        <Form.Select
          value={selectedBarangay}
          onChange={(e) => setSelectedBarangay(e.target.value)}
          style={{ maxWidth: '280px', fontSize: '13px' }}
        >
          <option value="">All Barangays</option>
          {BARANGAYS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Form.Select>
        {selectedBarangay && (
          <>
            <span
              style={{
                background: '#EEF2FF', color: '#4F46E5',
                border: '1px solid #C7D2FE', borderRadius: '9999px',
                fontSize: '12px', fontWeight: 600, padding: '3px 14px',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedBarangay}
            </span>
            <button
              style={{
                fontSize: '12px', color: '#71717A',
                border: '1px solid #E4E4E7', borderRadius: '9999px',
                padding: '3px 12px', background: '#fff', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => setSelectedBarangay('')}
            >
              ✕ Clear filter
            </button>
          </>
        )}
        <div className="ms-auto">
          <button
            onClick={() => selectedBarangay && exportBarangayProfileToCsv(selectedBarangay, currentYear, compliance.matrixData, compliance.barangayPerennialSummary)}
            disabled={!selectedBarangay}
            title={!selectedBarangay ? "Select a barangay to export its profile" : ""}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              background: !selectedBarangay ? '#F4F4F5' : '#FFFFFF', 
              color: !selectedBarangay ? '#A1A1AA' : '#4F46E5',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              border: !selectedBarangay ? '1px solid #E4E4E7' : '1px solid #C7D2FE', 
              cursor: !selectedBarangay ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (selectedBarangay) { e.currentTarget.style.background = '#4F46E5'; e.currentTarget.style.color = '#FFFFFF'; } }}
            onMouseLeave={e => { if (selectedBarangay) { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#4F46E5'; } }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Export Barangay Profile CSV
          </button>
        </div>
      </div>

      {/* ── Matrix Card ── */}
      <div className="analytics-card" style={{ background: '#fff', maxWidth: '100%' }}>
        <div className="chart-card-header chart-header-dark">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="chart-card-title" style={{ color: '#FFFFFF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', fontVariationSettings: "'FILL' 1", marginRight: '8px' }}>
                  grid_on
                </span>
                Compliance Matrix
              </p>
              <p className="chart-card-subtitle" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
            {(Object.entries(matrixChipConfig) as [string, { cls: string; label: string }][]).map(([key, cfg]) => (
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

          {/* Legend strip */}
          <div className="d-flex gap-3 mt-3 flex-wrap" style={{ fontSize: '12px' }}>
            {(Object.entries(matrixChipConfig) as [string, { cls: string; label: string }][]).map(([, cfg]) => (
              <span key={cfg.label} className={`matrix-chip ${cfg.cls}`}>{cfg.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Year-End Reports ── */}
      <div
        style={{
          borderTop: '2px solid #E4E4E7',
          marginTop: '28px',
          paddingTop: '28px',
        }}
      >

        <YearEndReports pending={pending} history={history} selectedBarangay={selectedBarangay} />
      </div>
    </>
  );
};

export default ComplianceMatrix;
