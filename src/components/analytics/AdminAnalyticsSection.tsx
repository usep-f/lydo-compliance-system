import React, { useMemo, useState } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import UnifiedGaugeChart from './UnifiedGaugeChart';
import UnifiedBarChart from './UnifiedBarChart';
import PerennialSubmissionsChart from './PerennialSubmissionsChart';
import { BARANGAYS } from '../../constants/barangays';
import {
  type PendingSubmission,
  type HistoricalSubmission,
} from '../../constants/submissionTypes';
import { useComplianceData, type TrendTimeframe, type TrendDocFilter } from '../../hooks/useComplianceData';
import StatCard from '../common/StatCard';
import ExportReportModal from './ExportReportModal';

// Register Chart.js
ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
  Tooltip, Legend, Filler,
);

ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.color = '#71717A';

/**
 * Chart.js plugin to horizontally offset overlapping datasets by a few pixels
 * so 'Submitted' (-5px), 'Approved' (0px), and 'Denied' (+5px) run parallel instead of occluding each other.
 */
const lineOffsetPlugin = {
  id: 'lineOffset',
  beforeDatasetDraw(chart: ChartJS, args: { index: number }) {
    chart.ctx.save();
    const dx = args.index === 0 ? -5 : args.index === 1 ? 0 : args.index === 2 ? 5 : 0;
    chart.ctx.translate(dx, 0);
  },
  afterDatasetDraw(chart: ChartJS) {
    chart.ctx.restore();
  },
};

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
   Timeframe toggle button group
───────────────────────────────────────────── */
const TimeframeToggle: React.FC<{
  value: TrendTimeframe;
  onChange: (val: TrendTimeframe) => void;
}> = ({ value, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #E4E4E7',
      flexShrink: 0,
      background: '#F4F4F5',
      padding: '2px',
      gap: '2px',
    }}
  >
    {(
      [
        { key: '7d', label: '7 Days' },
        { key: '30d', label: '30 Days' },
        { key: 'year', label: 'Year' },
      ] as const
    ).map((t) => {
      const isActive = value === t.key;
      return (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          style={{
            padding: '3px 10px',
            fontSize: '12px',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? '#18181B' : '#71717A',
            border: 'none',
            boxShadow: isActive ? 'var(--shadow-subtle-token)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────
   Document Category Toggle for Trend Chart
───────────────────────────────────────────── */
const TrendDocFilterToggle: React.FC<{
  value: TrendDocFilter;
  onChange: (val: TrendDocFilter) => void;
}> = ({ value, onChange }) => (
  <div
    style={{
      display: 'inline-flex',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #E4E4E7',
      flexShrink: 0,
      background: '#F4F4F5',
      padding: '2px',
      gap: '2px',
    }}
  >
    {(
      [
        { key: 'all', label: 'All Docs' },
        { key: 'perennial', label: 'Resolutions & Acc.' },
        { key: 'compliance', label: 'Scheduled & ASAP' },
      ] as const
    ).map((btn) => {
      const isActive = value === btn.key;
      return (
        <button
          key={btn.key}
          type="button"
          onClick={() => onChange(btn.key)}
          style={{
            padding: '3px 8px',
            fontSize: '11.5px',
            fontWeight: isActive ? 600 : 500,
            borderRadius: '6px',
            background: isActive ? '#fff' : 'transparent',
            color: isActive ? '#18181B' : '#71717A',
            border: 'none',
            boxShadow: isActive ? 'var(--shadow-subtle-token)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {btn.label}
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────
   Sort toggle button
───────────────────────────────────────────── */
const SortToggle: React.FC<{
  direction: 'desc' | 'asc';
  onToggle: () => void;
}> = ({ direction, onToggle }) => (
  <div
    style={{
      display: 'inline-flex',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #E4E4E7',
      flexShrink: 0,
    }}
  >
    {(['desc', 'asc'] as const).map((dir) => {
      const isActive = direction === dir;
      return (
        <button
          key={dir}
          type="button"
          onClick={() => { if (!isActive) onToggle(); }}
          title={dir === 'desc' ? 'Highest first' : 'Lowest first'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '28px',
            background: isActive ? '#4F46E5' : '#fff',
            color: isActive ? '#fff' : '#71717A',
            border: 'none',
            cursor: isActive ? 'default' : 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {dir === 'desc' ? 'arrow_downward' : 'arrow_upward'}
          </span>
        </button>
      );
    })}
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
interface AdminAnalyticsSectionProps {
  pending: PendingSubmission[];
  history: HistoricalSubmission[];
  adminName?: string;
}

const AdminAnalyticsSection: React.FC<AdminAnalyticsSectionProps> = ({
  pending = [],
  history = [],
  adminName = 'Admin',
}) => {
  const currentYear = new Date().getFullYear();

  // Global barangay filter — '' means "All Barangays"
  const [selectedBarangay, setSelectedBarangay] = useState('');

  // Report Generator Modal visibility state
  const [showExportModal, setShowExportModal] = useState(false);

  // Sort direction for the compliance ranking bar chart
  const [rankingSortDir, setRankingSortDir] = useState<'desc' | 'asc'>('desc');

  // Timeframe filter for Submission Trend chart
  const [trendTimeframe, setTrendTimeframe] = useState<TrendTimeframe>('year');

  // Document category filter for Submission Trend chart
  const [trendDocFilter, setTrendDocFilter] = useState<TrendDocFilter>('all');

  const approved = useMemo(
    () => history.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)),
    [history],
  );
  const denied = useMemo(
    () => history.filter((s) => s.status === 'denied'),
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

  const compliance = useComplianceData(
    currentYear,
    filteredPending,
    approved,
    activeBarangays,
    trendTimeframe,
    denied,
    trendDocFilter,
  );

  // Compute total approved documents for current year and barangay filter
  const approvedCount = useMemo(() => {
    const brgyApproved = selectedBarangay
      ? approved.filter((s) => s.barangay === selectedBarangay && s.year === currentYear)
      : approved.filter((s) => s.year === currentYear);
    return brgyApproved.length;
  }, [approved, selectedBarangay, currentYear]);

  // Compute total pending submissions for current year and barangay filter
  const pendingCount = useMemo(() => {
    const brgyPending = selectedBarangay
      ? pending.filter((s) => s.barangay === selectedBarangay && s.year === currentYear)
      : pending.filter((s) => s.year === currentYear);
    return brgyPending.length;
  }, [pending, selectedBarangay, currentYear]);

  // ── KPI cards — context-sensitive per barangay or system-wide ─────────────
  const kpiCards = selectedBarangay
    ? [
        { title: 'Compliance Status',   value: compliance.fullyCompliantCount === 1 ? 'Compliant' : 'Behind',      variant: compliance.fullyCompliantCount === 1 ? 'success' as const : 'danger' as const, icon: 'verified'      },
        { title: 'Approved Documents',  value: approvedCount,                                                       variant: 'info'    as const, icon: 'task_alt'        },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Pending Submissions', value: pendingCount,                                                        variant: 'warning' as const, icon: 'pending_actions' },
      ]
    : [
        { title: 'Fully Compliant',     value: `${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`, variant: 'success' as const, icon: 'verified'       },
        { title: 'Approved Documents',  value: approvedCount,                                                       variant: 'info'    as const, icon: 'task_alt'        },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Pending Submissions', value: pendingCount,                                                        variant: 'warning' as const, icon: 'pending_actions' },
      ];

  // ── Chart Data ──────────────────────────────────────────────────

  const totalExpectedAll = useMemo(() => (
    Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))
  ), [compliance.barangayRanking]);

  const pendingPct = useMemo(() => Math.round(
    (compliance.pendingReviewCount / totalExpectedAll) * 100,
  ), [compliance.pendingReviewCount, totalExpectedAll]);

  const deniedCount = useMemo(() => {
    const brgyDenied = selectedBarangay
      ? history.filter((s) => s.barangay === selectedBarangay && s.status === 'denied' && s.year === currentYear)
      : history.filter((s) => s.status === 'denied' && s.year === currentYear);
    return brgyDenied.length;
  }, [history, selectedBarangay, currentYear]);

  const deniedPct = useMemo(() => Math.round(
    (deniedCount / totalExpectedAll) * 100,
  ), [deniedCount, totalExpectedAll]);

  const gaugeSlices = useMemo(() => [
    { label: 'Approved',       value: compliance.overallRate, color: '#16A34A' },
    { label: 'Pending Review', value: pendingPct,             color: '#F59E0B' },
    {
      label: 'Missing',
      value: Math.max(0, 100 - compliance.overallRate - pendingPct - deniedPct),
      color: '#EF4444',
      isStriped: true,
    },
    { label: 'Denied',         value: deniedPct,              color: '#18181B' },
  ], [compliance.overallRate, pendingPct, deniedPct]);

  // Sorted ranking list controlled by the sort direction toggle
  const sortedRanking = useMemo(() => {
    const list = [...compliance.barangayRanking];
    return rankingSortDir === 'desc'
      ? list.sort((a, b) => b.rate - a.rate)
      : list.sort((a, b) => a.rate - b.rate);
  }, [compliance.barangayRanking, rankingSortDir]);

  const top5 = useMemo(() => sortedRanking.slice(0, 5), [sortedRanking]);

  // Barangay Compliance Ranking Bar Chart
  const rankingCategories = useMemo(() => top5.map((b) => ({
    label: b.barangay,
    values: { rate: b.rate },
    color: b.rate >= 80 ? '#16A34A' : b.rate >= 50 ? '#F59E0B' : '#EF4444',
    tooltipSubtext: `${b.approved}/${b.expected} approved`,
  })), [top5]);

  const rankingSeries = useMemo(() => [
    { key: 'rate', label: 'Compliance Rate', color: '#16A34A' },
  ], []);

  // Document Type Compliance (horizontal progress bars normalized to compliance rate %)
  const docTypeCategories = useMemo(() => compliance.docTypeCompliance.map((d) => ({
    label: d.label,
    values: { rate: d.rate },
    color: d.rate >= 80 ? '#16A34A' : d.rate >= 50 ? '#F59E0B' : d.rate > 0 ? '#0284C7' : '#94A3B8',
    tooltipSubtext: `${d.approved}/${d.expected} approved`,
  })), [compliance.docTypeCompliance]);

  const docTypeSeries = useMemo(() => [
    { key: 'rate', label: 'Compliance Rate', color: '#0284C7' },
  ], []);

  const trendSubtitle = useMemo(() => {
    const docText =
      trendDocFilter === 'perennial'
        ? 'Resolutions & Accomplishment Reports'
        : trendDocFilter === 'compliance'
        ? 'Scheduled & ASAP Documents'
        : 'All Submissions (Scheduled, ASAP, Resolutions & Accomplishments)';

    const rangeText =
      trendTimeframe === '7d'
        ? 'Daily volume (Past 7 days)'
        : trendTimeframe === '30d'
        ? 'Daily volume (Past 30 days)'
        : 'Monthly volume';

    const base = `${docText} — ${rangeText}`;
    return selectedBarangay ? `${base} — ${selectedBarangay}` : base;
  }, [trendDocFilter, trendTimeframe, selectedBarangay]);

  const trendLineData = {
    labels: compliance.monthlyTrend.map((m) => m.month),
    datasets: [
      {
        label: 'Submitted',
        data: compliance.monthlyTrend.map((m) => m.submitted),
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#06B6D4',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
      },
      {
        label: 'Approved',
        data: compliance.monthlyTrend.map((m) => m.approved),
        borderColor: '#16A34A',
        backgroundColor: 'transparent',
        borderDash: [5, 4],
        fill: false,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#16A34A',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
      },
      {
        label: 'Denied',
        data: compliance.monthlyTrend.map((m) => m.denied),
        borderColor: '#18181B',
        backgroundColor: 'transparent',
        borderDash: [3, 3],
        fill: false,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#18181B',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
      },
    ],
  };

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 20,
          usePointStyle: false,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#18181B',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        offset: true,
      },
      y: {
        grid: { color: '#F4F4F5' },
        border: { display: false },
        beginAtZero: true,
        ticks: { display: false },
      },
    },
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {/* 0 ── Global Barangay Filter */}
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
              className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1 px-3 py-1 shadow-sm"
              style={{ borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
              onClick={() => setShowExportModal(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span>
              Generate Reports &amp; Exports
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
              className="btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 py-2 shadow-sm"
              style={{ borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}
              onClick={() => setShowExportModal(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>summarize</span>
              Generate Reports &amp; Exports
            </button>
          </div>
        </div>
      </div>

      {/* 1 ── Row 1: KPI Stat Cards */}
      <Row className="mb-4 g-2 g-sm-3">
        {kpiCards.map((card, i) => (
          <Col xs={6} sm={6} md={3} key={card.title} className="kpi-animate" style={{ animationDelay: `${i * 75}ms` }}>
            <StatCard
              title={card.title}
              value={card.value}
              variant={card.variant}
              icon={card.icon}
            />
          </Col>
        ))}
      </Row>

      {/* 2 ── Row 2: Overall Compliance (Gauge) + Submission Trend (Line) */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <div className="analytics-card h-100" style={{ background: '#fff' }}>
            <UnifiedGaugeChart
              title="Overall Compliance"
              subtitle={selectedBarangay ? `Share of approved vs. pending vs. missing vs. denied — ${selectedBarangay}` : "Share of approved vs. pending vs. missing vs. denied"}
              slices={gaugeSlices}
              centerValue={`${compliance.overallRate}%`}
              centerLabel="Compliant"
              valueSuffix="%"
              emptyMessage="No compliance data available."
            />
          </div>
        </Col>

        <Col md={8}>
          <AnalyticsCard
            headerClass="chart-header-info"
            icon="trending_up"
            iconClass="icon-info"
            title="Submission Trend"
            subtitle={trendSubtitle}
            headerRight={
              <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                <TrendDocFilterToggle value={trendDocFilter} onChange={setTrendDocFilter} />
                <TimeframeToggle value={trendTimeframe} onChange={setTrendTimeframe} />
              </div>
            }
          >
            <div style={{ height: '280px' }}>
              <Line data={trendLineData} options={trendLineOptions} plugins={[lineOffsetPlugin]} />
            </div>
          </AnalyticsCard>
        </Col>
      </Row>

      {/* 3 ── Row 3: Document Type Compliance (Full Width) */}
      <Row className="mb-4 g-3">
        <Col md={12}>
          <div className="analytics-card h-100" style={{ background: '#fff' }}>
            <UnifiedBarChart
              title="Document Type Compliance"
              subtitle={
                selectedBarangay
                  ? `Compliance rate (% approved vs. target) — ${selectedBarangay}`
                  : "Compliance rate (% approved vs. target) per document type"
              }
              categories={docTypeCategories}
              series={docTypeSeries}
              orientation="horizontal"
              valueSuffix="%"
              maxValue={100}
            />
          </div>
        </Col>
      </Row>

      {/* 4 ── Row 4: Dedicated Perennial Submissions Chart (Resolutions & Accomplishment Reports) */}
      <Row className="mb-4 g-3">
        <Col md={12}>
          <PerennialSubmissionsChart
            summary={compliance.overallPerennialSummary}
            selectedBarangay={selectedBarangay}
          />
        </Col>
      </Row>

      {/* 5 ── Row 5: Barangay Compliance Ranking (Full Width, hidden when filtered) */}
      {!selectedBarangay && (
        <Row className="mb-4 g-3">
          <Col md={12}>
            <div className="analytics-card h-100" style={{ background: '#fff' }}>
              <UnifiedBarChart
                title="Barangay Compliance Ranking"
                subtitle={rankingSortDir === 'desc' ? 'Top 5 — green ≥ 80%, amber ≥ 50%, red < 50%' : 'Bottom 5 — green ≥ 80%, amber ≥ 50%, red < 50%'}
                headerRight={
                  <SortToggle
                    direction={rankingSortDir}
                    onToggle={() => setRankingSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  />
                }
                categories={rankingCategories}
                series={rankingSeries}
                orientation="horizontal"
                valueSuffix="%"
                maxValue={100}
              />
            </div>
          </Col>
        </Row>
      )}

      {/* Centralized Export & Report Generator Modal */}
      <ExportReportModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        adminName={adminName}
        compliance={compliance}
        pendingSubmissions={pending}
        historySubmissions={history}
        currentYear={currentYear}
      />
    </>
  );
};

export default AdminAnalyticsSection;
