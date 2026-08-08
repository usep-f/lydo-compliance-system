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
import { BARANGAYS } from '../../constants/barangays';
import {
  type PendingSubmission,
  type HistoricalSubmission,
} from '../../constants/submissionTypes';
import { useComplianceData, type TrendTimeframe } from '../../hooks/useComplianceData';
import StatCard from '../common/StatCard';
import { exportBarangayProfileToCsv } from '../../utils/csvUtils';

// Register Chart.js
ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement,
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
}

const AdminAnalyticsSection: React.FC<AdminAnalyticsSectionProps> = ({
  pending = [],
  history = [],
}) => {
  const currentYear = new Date().getFullYear();

  // Global barangay filter — '' means "All Barangays"
  const [selectedBarangay, setSelectedBarangay] = useState('');

  // Sort direction for the compliance ranking bar chart
  const [rankingSortDir, setRankingSortDir] = useState<'desc' | 'asc'>('desc');

  // Timeframe filter for Submission Trend chart
  const [trendTimeframe, setTrendTimeframe] = useState<TrendTimeframe>('year');

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

  const compliance = useComplianceData(currentYear, filteredPending, approved, activeBarangays, trendTimeframe);

  // Compute total submitted documents (both pending and history) for current year and barangay filter
  const submittedCount = useMemo(() => {
    const brgyPending = selectedBarangay
      ? pending.filter((s) => s.barangay === selectedBarangay && s.year === currentYear)
      : pending.filter((s) => s.year === currentYear);
    const brgyHistory = selectedBarangay
      ? history.filter((s) => s.barangay === selectedBarangay && s.year === currentYear)
      : history.filter((s) => s.year === currentYear);
    return brgyPending.length + brgyHistory.length;
  }, [pending, history, selectedBarangay, currentYear]);

  // ── KPI cards — context-sensitive per barangay or system-wide ─────────────
  const kpiCards = selectedBarangay
    ? [
        { title: 'Compliance Rate',     value: `${compliance.overallRate}%`,                                        variant: 'primary' as const, icon: 'check_circle'   },
        { title: 'Compliance Status',   value: compliance.fullyCompliantCount === 1 ? 'Compliant' : 'Behind',      variant: compliance.fullyCompliantCount === 1 ? 'success' as const : 'danger' as const, icon: 'verified'      },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Submitted Documents', value: submittedCount,                                                      variant: 'info' as const,    icon: 'upload_file'    },
      ]
    : [
        { title: 'Overall Compliance',  value: `${compliance.overallRate}%`,                                        variant: 'primary' as const, icon: 'check_circle'   },
        { title: 'Fully Compliant',     value: `${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`, variant: 'success' as const, icon: 'verified'       },
        { title: 'Overdue Submissions', value: compliance.overdueCount,                                             variant: 'danger'  as const, icon: 'error'          },
        { title: 'Submitted Documents', value: submittedCount,                                                      variant: 'info' as const,    icon: 'upload_file'    },
      ];

  // ── Chart Data ──────────────────────────────────────────────────

  const pendingPct = useMemo(() => Math.round(
    (compliance.pendingReviewCount /
      Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) * 100,
  ), [compliance.pendingReviewCount, compliance.barangayRanking]);

  const gaugeSlices = useMemo(() => [
    { label: 'Approved',       value: compliance.overallRate, color: '#16A34A' },
    { label: 'Pending Review', value: pendingPct,             color: '#F59E0B' },
    {
      label: 'Missing',
      value: Math.max(0, 100 - compliance.overallRate - pendingPct),
      color: '#EF4444',
      isStriped: true,
    },
  ], [compliance.overallRate, pendingPct]);

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

  // Single-barangay: Document Type Breakdown
  const docBreakdownCategories = useMemo(() => compliance.docTypeCompliance.map((d) => ({
    label: d.label,
    values: {
      approved: d.approved,
      remaining: Math.max(0, d.expected - d.approved),
    },
    tooltipSubtext: `${d.approved}/${d.expected} approved`,
  })), [compliance.docTypeCompliance]);

  const docBreakdownSeries = useMemo(() => [
    { key: 'approved',  label: 'Approved Submissions', color: '#16A34A' },
    { key: 'remaining', label: 'Remaining Target',     color: '#BBF7D0' },
  ], []);

  // Document Type Compliance (vertical single-column stacked pill bar chart)
  const docTypeBarCategories = useMemo(() => compliance.docTypeCompliance.map((d) => ({
    label: d.label,
    values: {
      approved: d.approved,
      remaining: Math.max(0, d.expected - d.approved),
    },
    tooltipSubtext: `${d.approved}/${d.expected} approved`,
  })), [compliance.docTypeCompliance]);

  const docTypeBarSeries = useMemo(() => [
    { key: 'approved',  label: 'Approved Submissions', color: '#006EB7' },
    { key: 'remaining', label: 'Remaining Target',     color: '#C7D2FE' },
  ], []);

  const trendSubtitle = useMemo(() => {
    const rangeText =
      trendTimeframe === '7d'
        ? 'Daily submission vs. approval volume (Past 7 days)'
        : trendTimeframe === '30d'
        ? 'Daily submission vs. approval volume (Past 30 days)'
        : 'Monthly submission vs. approval volume';
    return selectedBarangay ? `${rangeText} — ${selectedBarangay}` : rangeText;
  }, [trendTimeframe, selectedBarangay]);

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
              className="bfc-btn-export"
              onClick={() => selectedBarangay && exportBarangayProfileToCsv(selectedBarangay, currentYear, compliance.matrixData, compliance.barangayPerennialSummary)}
              disabled={!selectedBarangay}
              title={!selectedBarangay ? "Select a barangay to export its profile" : ""}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              Export Barangay Profile CSV
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
              onClick={() => selectedBarangay && exportBarangayProfileToCsv(selectedBarangay, currentYear, compliance.matrixData, compliance.barangayPerennialSummary)}
              disabled={!selectedBarangay}
              title={!selectedBarangay ? "Select a barangay to export its profile" : ""}
            >
              <span className="material-symbols-outlined">download</span>
              Export Barangay Profile CSV
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
              subtitle={selectedBarangay ? `Share of approved vs. pending vs. missing — ${selectedBarangay}` : "Share of approved vs. pending vs. missing"}
              slices={gaugeSlices}
              centerValue={`${compliance.overallRate}%`}
              centerLabel="Compliant"
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
            headerRight={<TimeframeToggle value={trendTimeframe} onChange={setTrendTimeframe} />}
          >
            <div style={{ height: '280px' }}>
              <Line data={trendLineData} options={trendLineOptions} />
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
              subtitle={selectedBarangay ? `Expected vs. approved — ${selectedBarangay}` : "Expected vs. approved per document type"}
              categories={selectedBarangay ? docBreakdownCategories : docTypeBarCategories}
              series={selectedBarangay ? docBreakdownSeries : docTypeBarSeries}
              orientation="vertical"
              stacked={true}
              chartHeight={190}
            />
          </div>
        </Col>
      </Row>

      {/* 4 ── Row 4: Barangay Compliance Ranking (Full Width, hidden when filtered) */}
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
    </>
  );
};

export default AdminAnalyticsSection;
