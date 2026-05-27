import React, { useMemo, useState } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { BARANGAYS } from '../../constants/barangays';
import {
  SCHEDULED_TYPES,
  ASAP_TYPES,
  ALL_UPLOAD_TYPES,
  ACCOMPLISHMENT_CATEGORIES,
} from '../../constants/submissionTypes';
import { useSubmissions } from '../../hooks/useSubmissions';
import { useComplianceData } from '../../hooks/useComplianceData';
import { formatPeriodLabel } from '../../utils/periodUtils';
import StatCard from '../common/StatCard';

// Register Chart.js
ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, ArcElement,
  Tooltip, Legend, Filler,
);

ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.color = '#71717A';

/* ─────────────────────────────────────────────
   Small shared sub-components
───────────────────────────────────────────── */

/** Analytics card with tinted header strip */
const AnalyticsCard: React.FC<{
  headerClass: string;
  icon: string;
  iconClass: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}> = ({ headerClass, icon, iconClass, title, subtitle, children, headerRight }) => (
  <div className="analytics-card h-100" style={{ background: '#fff' }}>
    <div className={`chart-card-header ${headerClass}`}>
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div>
          <p className="chart-card-title">
            <span className={`material-symbols-outlined ${iconClass}`} style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
              {icon}
            </span>
            {title}
          </p>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Matrix status chip
───────────────────────────────────────────── */
const matrixChipConfig: Record<string, { cls: string; label: string }> = {
  approved: { cls: 'matrix-chip-approved', label: '✓ Done'    },
  pending:  { cls: 'matrix-chip-pending',  label: '⏳ Review' },
  missing:  { cls: 'matrix-chip-missing',  label: '✗ Missing' },
  not_due:  { cls: 'matrix-chip-not-due',  label: '— —'       },
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const AdminAnalyticsSection: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);

  // Global barangay filter — '' means "All Barangays"
  const [selectedBarangay, setSelectedBarangay] = useState('');

  const { pending = [], history = [] } = useSubmissions(undefined, true);
  const approved = useMemo(
    () => history.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [history],
  );

  // Scope barangay list and pending submissions to the active filter
  const activeBarangays = useMemo(
    () => (selectedBarangay ? [selectedBarangay] : BARANGAYS),
    [selectedBarangay],
  );
  const filteredPending = useMemo(
    () => (selectedBarangay ? pending.filter((s) => s.barangay === selectedBarangay) : pending),
    [pending, selectedBarangay],
  );

  const compliance = useComplianceData(selectedYear, filteredPending, approved, activeBarangays);

  // Per-barangay perennial filter — auto-syncs to the global filter
  const [selectedPerennialBarangay, setSelectedPerennialBarangay] = useState(BARANGAYS[0] || '');
  const [matrixDocType, setMatrixDocType] = useState(ALL_UPLOAD_TYPES[0]?.id || '');

  const effectivePerennialBarangay = selectedBarangay || selectedPerennialBarangay;

  const selectedPerennial = useMemo(() => {
    const entry = compliance.barangayPerennialSummary.find(
      (c) => c.barangay === effectivePerennialBarangay,
    );
    if (!entry) {
      return {
        resolutions: 0,
        accomplishmentsTotal: 0,
        categoryData: ACCOMPLISHMENT_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label, count: 0 })),
      };
    }
    return entry;
  }, [compliance.barangayPerennialSummary, effectivePerennialBarangay]);

  const matrixForDocType = useMemo(() => {
    const cells = compliance.matrixData.filter((c) => c.docType === matrixDocType);
    const periods = [...new Set(cells.map((c) => c.period))];
    return { cells, periods };
  }, [compliance.matrixData, matrixDocType]);

  // ── Chart Data ──────────────────────────────────────────────────

  const doughnutData = {
    labels: ['Approved', 'Pending', 'Missing'],
    datasets: [{
      data: [
        compliance.overallRate,
        Math.round(
          (compliance.pendingReviewCount /
            Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) * 100,
        ),
        Math.max(
          0,
          100 - compliance.overallRate -
          Math.round(
            (compliance.pendingReviewCount /
              Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) * 100,
          ),
        ),
      ],
      backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
      borderWidth: 0,
      cutout: '72%',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 10, padding: 16, font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw}%` } },
    },
  };

  const top15 = compliance.barangayRanking.slice(0, 15);
  const barangayBarData = {
    labels: top15.map((b) => b.barangay.length > 20 ? b.barangay.slice(0, 18) + '…' : b.barangay),
    datasets: [{
      label: 'Compliance %',
      data: top15.map((b) => b.rate),
      backgroundColor: top15.map((b) => b.rate >= 80 ? '#22C55E' : b.rate >= 50 ? '#F59E0B' : '#EF4444'),
      borderRadius: 6,
      barThickness: 16,
    }],
  };

  const barangayBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const b = compliance.barangayRanking[ctx.dataIndex];
            return `${b.approved}/${b.expected} (${b.rate}%)`;
          },
        },
      },
    },
    scales: {
      x: { max: 100, grid: { color: '#F4F4F5' }, ticks: { callback: (v: any) => `${v}%` } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const docTypeBarData = {
    labels: compliance.docTypeCompliance.map((d) =>
      d.label.length > 25 ? d.label.slice(0, 22) + '…' : d.label,
    ),
    datasets: [
      {
        label: 'Expected',
        data: compliance.docTypeCompliance.map((d) => d.expected),
        backgroundColor: '#E0E7FF',
        borderRadius: 5,
        barThickness: 22,
      },
      {
        label: 'Approved',
        data: compliance.docTypeCompliance.map((d) => d.approved),
        backgroundColor: '#4F46E5',
        borderRadius: 5,
        barThickness: 22,
      },
    ],
  };

  const docTypeBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 12 } } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F4F4F5' }, beginAtZero: true },
    },
  };

  const trendLineData = {
    labels: compliance.monthlyTrend.map((m) => m.month),
    datasets: [
      {
        label: 'Submitted',
        data: compliance.monthlyTrend.map((m) => m.submitted),
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6, 182, 212, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
      {
        label: 'Approved',
        data: compliance.monthlyTrend.map((m) => m.approved),
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
    ],
  };

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 12 } } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F4F4F5' }, beginAtZero: true },
    },
  };

  // ── Single-barangay: Document Type Breakdown chart ────────────────────────
  const docBreakdownData = {
    labels: compliance.docTypeCompliance.map((d) =>
      d.label.length > 22 ? d.label.slice(0, 20) + '\u2026' : d.label,
    ),
    datasets: [
      {
        label: 'Expected',
        data: compliance.docTypeCompliance.map((d) => d.expected),
        backgroundColor: '#E0E7FF',
        borderRadius: 5,
        barThickness: 14,
      },
      {
        label: 'Approved',
        data: compliance.docTypeCompliance.map((d) => d.approved),
        backgroundColor: '#22C55E',
        borderRadius: 5,
        barThickness: 14,
      },
    ],
  };

  const docBreakdownOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 10, font: { size: 12 } } } },
    scales: {
      x: { grid: { color: '#F4F4F5' }, beginAtZero: true },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  // ── KPI cards — context-sensitive per barangay or system-wide ─────────────
  const kpiCards = selectedBarangay
    ? [
        { title: 'Compliance Rate',     value: `${compliance.overallRate}%`,                                        variant: 'primary' as const, icon: 'check_circle'   },
        { title: 'Compliance Status',   value: compliance.fullyCompliantCount === 1 ? 'Compliant' : 'Behind',      variant: compliance.fullyCompliantCount === 1 ? 'success' as const : 'danger' as const, icon: 'verified'      },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Pending Review',      value: compliance.pendingReviewCount,                                       variant: 'warning' as const, icon: 'pending_actions' },
      ]
    : [
        { title: 'Overall Compliance',  value: `${compliance.overallRate}%`,                                        variant: 'primary' as const, icon: 'check_circle'   },
        { title: 'Fully Compliant',     value: `${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`, variant: 'success' as const, icon: 'verified'       },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Pending Review',      value: compliance.pendingReviewCount,                                       variant: 'warning' as const, icon: 'pending_actions' },
      ];

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* 0 ── Global Barangay Filter */}
      <div
        className="mb-4 d-flex align-items-center gap-3 flex-wrap p-3"
        style={{ background: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: '12px' }}
      >
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
      </div>

      {/* 1 ── KPI Stat Cards */}
      <Row className="mb-4 g-3">
        {kpiCards.map((card, i) => (
          <Col md={3} key={card.title} className="kpi-animate" style={{ animationDelay: `${i * 75}ms` }}>
            <StatCard
              title={card.title}
              value={card.value}
              variant={card.variant}
              icon={card.icon}
            />
          </Col>
        ))}
      </Row>

      {/* 2 ── Doughnut + Barangay Ranking */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <AnalyticsCard
            headerClass="chart-header-primary"
            icon="donut_large"
            iconClass="icon-primary"
            title="Overall Compliance"
            subtitle="Share of approved vs. pending vs. missing"
          >
            <div style={{ height: '260px', position: 'relative' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div
                className="position-absolute top-50 start-50 translate-middle text-center"
                style={{ pointerEvents: 'none', marginTop: '-18px' }}
              >
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '30px', fontWeight: 800, color: '#18181B', lineHeight: 1 }}>
                  {compliance.overallRate}%
                </div>
                <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Compliant
                </div>
              </div>
            </div>
          </AnalyticsCard>
        </Col>

        <Col md={8}>
          {selectedBarangay ? (
            <AnalyticsCard
              headerClass="chart-header-success"
              icon="list_alt"
              iconClass="icon-success"
              title="Document Type Breakdown"
              subtitle={`Expected vs. approved — ${selectedBarangay}`}
            >
              <div style={{ height: '300px' }}>
                <Bar data={docBreakdownData} options={docBreakdownOptions} />
              </div>
            </AnalyticsCard>
          ) : (
            <AnalyticsCard
              headerClass="chart-header-success"
              icon="bar_chart"
              iconClass="icon-success"
              title="Barangay Compliance Ranking"
              subtitle="Top 15 — green ≥ 80%, amber ≥ 50%, red < 50%"
            >
              <div style={{ height: '300px' }}>
                <Bar data={barangayBarData} options={barangayBarOptions} />
              </div>
            </AnalyticsCard>
          )}
        </Col>
      </Row>

      {/* 3 ── Compliance Matrix */}
      <div className="analytics-card mb-4" style={{ background: '#fff' }}>
        <div className="chart-card-header chart-header-violet">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="chart-card-title">
                <span className="material-symbols-outlined icon-violet" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                  grid_on
                </span>
                Compliance Matrix
              </p>
              <p className="chart-card-subtitle">Barangay × Period status for selected document type</p>
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
          <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="table table-sm table-hover mb-0" style={{ fontSize: '12px' }}>
              <thead className="sticky-top bg-white">
                <tr>
                  <th style={{ minWidth: '170px' }}>Barangay</th>
                  {matrixForDocType.periods.map((p) => (
                    <th key={p} className="text-center" style={{ minWidth: '90px' }}>
                      {p === 'ASAP' ? 'Status' : formatPeriodLabel(p).replace(` ${selectedYear}`, '')}
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
            {Object.entries(matrixChipConfig).map(([, cfg]) => (
              <span key={cfg.label} className={`matrix-chip ${cfg.cls}`}>{cfg.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 4 ── Doc Type Compliance + Submission Trend */}
      <Row className="mb-4 g-3">
        <Col md={6}>
          <AnalyticsCard
            headerClass="chart-header-warning"
            icon="description"
            iconClass="icon-warning"
            title="Document Type Compliance"
            subtitle="Expected vs. approved per document type"
          >
            <div style={{ height: '280px' }}>
              <Bar data={docTypeBarData} options={docTypeBarOptions} />
            </div>
          </AnalyticsCard>
        </Col>
        <Col md={6}>
          <AnalyticsCard
            headerClass="chart-header-info"
            icon="trending_up"
            iconClass="icon-info"
            title="Submission Trend"
            subtitle="Monthly submission vs. approval volume"
          >
            <div style={{ height: '280px' }}>
              <Line data={trendLineData} options={trendLineOptions} />
            </div>
          </AnalyticsCard>
        </Col>
      </Row>

      {/* 5 ── Year-End Counts (dark header) */}
      <div className="analytics-card mb-4" style={{ background: '#fff' }}>
        <div className="chart-card-header chart-header-dark">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div>
              <p className="chart-card-title" style={{ color: '#FFFFFF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', fontVariationSettings: "'FILL' 1" }}>
                  analytics
                </span>
                Year-End Counts &mdash; {selectedYear}
              </p>
              <p className="chart-card-subtitle" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Per-barangay resolutions & accomplishment reports
              </p>
            </div>
            {!selectedBarangay && (
              <Form.Select
                value={selectedPerennialBarangay}
                onChange={(e) => setSelectedPerennialBarangay(e.target.value)}
                style={{ maxWidth: '280px', fontSize: '13px' }}
              >
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Form.Select>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* KPI mini-cards */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <StatCard title="Resolutions" value={selectedPerennial.resolutions} variant="primary" icon="gavel" />
            </Col>
            <Col md={6}>
              <StatCard title="Total Accomplishment Reports" value={selectedPerennial.accomplishmentsTotal} variant="info" icon="assignment_turned_in" />
            </Col>
          </Row>

          {/* Category Breakdown */}
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
                Category Breakdown
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
        </div>
      </div>
    </>
  );
};

export default AdminAnalyticsSection;
