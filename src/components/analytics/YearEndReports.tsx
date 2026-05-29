import React, { useMemo } from 'react';
import { Row, Col } from 'react-bootstrap';
import { BARANGAYS } from '../../constants/barangays';
import { ACCOMPLISHMENT_CATEGORIES, type PendingSubmission, type HistoricalSubmission } from '../../constants/submissionTypes';
import { useComplianceData } from '../../hooks/useComplianceData';
import StatCard from '../common/StatCard';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */
interface YearEndReportsProps {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  selectedBarangay: string;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const YearEndReports: React.FC<YearEndReportsProps> = ({
  pending = [],
  history = [],
  selectedBarangay,
}) => {
  const currentYear = new Date().getFullYear();

  const approved = useMemo(
    () => history.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [history],
  );

  const compliance = useComplianceData(currentYear, pending, approved, BARANGAYS);

  const selectedPerennial = useMemo(() => {
    const entry = compliance.barangayPerennialSummary.find(
      (c) => c.barangay === selectedBarangay,
    );
    if (!entry) {
      return {
        resolutions: 0,
        accomplishmentsTotal: 0,
        categoryData: ACCOMPLISHMENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: 0 })),
      };
    }
    return entry;
  }, [compliance.barangayPerennialSummary, selectedBarangay]);

  return (
    <>
      {/* ── Per-Barangay Detailed View ── */}
      <div className="analytics-card" style={{ background: '#fff' }}>
        <div className="chart-card-header chart-header-dark">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="chart-card-title" style={{ color: '#FFFFFF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', fontVariationSettings: "'FILL' 1" }}>
                  analytics
                </span>
                Year-End Counts &mdash; {currentYear}
              </p>
              <p className="chart-card-subtitle" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Per-barangay resolutions &amp; accomplishment reports breakdown
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {!selectedBarangay ? (
            <div className="text-center py-5">
              <span className="material-symbols-outlined mb-3" style={{ fontSize: '48px', color: '#D4D4D8' }}>
                location_city
              </span>
              <h5 style={{ color: '#52525B', fontWeight: 600, fontSize: '16px' }}>No Barangay Selected</h5>
              <p style={{ color: '#71717A', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
                Please select a specific barangay from the filter above to view detailed year-end counts, resolutions, and accomplishment reports.
              </p>
            </div>
          ) : (
            <>
              {/* Per-barangay KPI mini-cards */}
              <Row className="mb-4 g-3">
                <Col md={6}>
                  <StatCard
                    title={`Resolutions — ${selectedBarangay}`}
                    value={selectedPerennial.resolutions}
                    variant="primary"
                    icon="gavel"
                  />
                </Col>
                <Col md={6}>
                  <StatCard
                    title={`Total Accomplishment Reports — ${selectedBarangay}`}
                    value={selectedPerennial.accomplishmentsTotal}
                    variant="info"
                    icon="assignment_turned_in"
                  />
                </Col>
              </Row>

              {/* Category breakdown table */}
              <div
                style={{
                  background: '#FAFAFA',
                  border: '1px solid #E4E4E7',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E4E7' }}>
                  <span style={{ fontFamily: 'var(--font-headline)', fontSize: '13px', fontWeight: 700, color: '#18181B' }}>
                    Accomplishment Category Breakdown
                  </span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {selectedPerennial.categoryData.map((cat, idx) => (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 16px',
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        borderBottom: idx < selectedPerennial.categoryData.length - 1 ? '1px solid #F4F4F5' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#3F3F46' }}>{cat.label}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '40px',
                          padding: '2px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-body)',
                          background: cat.count > 0 ? '#EEF2FF' : '#F4F4F5',
                          color: cat.count > 0 ? '#4F46E5' : '#A1A1AA',
                          border: `1px solid ${cat.count > 0 ? '#C7D2FE' : '#E4E4E7'}`,
                        }}
                      >
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default YearEndReports;
