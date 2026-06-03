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
  type TooltipItem,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { BARANGAYS } from '../../constants/barangays';
import {
  type PendingSubmission,
  type HistoricalSubmission,
} from '../../constants/submissionTypes';
import { useComplianceData } from '../../hooks/useComplianceData';
import StatCard from '../common/StatCard';
import { exportBarangayProfileToCsv } from '../../utils/csvUtils';

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

  const compliance = useComplianceData(currentYear, filteredPending, approved, activeBarangays);

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
      tooltip: { callbacks: { label: (ctx: TooltipItem<'doughnut'>) => `${ctx.label}: ${ctx.raw}%` } },
    },
  };

  // Sorted ranking list controlled by the sort direction toggle
  const sortedRanking = useMemo(() => {
    const list = [...compliance.barangayRanking];
    return rankingSortDir === 'desc'
      ? list.sort((a, b) => b.rate - a.rate)
      : list.sort((a, b) => a.rate - b.rate);
  }, [compliance.barangayRanking, rankingSortDir]);

  const top5 = sortedRanking.slice(0, 5);
  const barangayBarData = {
    labels: top5.map((b) => b.barangay.length > 20 ? b.barangay.slice(0, 18) + '…' : b.barangay),
    datasets: [{
      label: 'Compliance %',
      data: top5.map((b) => b.rate),
      backgroundColor: top5.map((b) => b.rate >= 80 ? '#22C55E' : b.rate >= 50 ? '#F59E0B' : '#EF4444'),
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
          label: (ctx: TooltipItem<'bar'>) => {
            const b = top5[ctx.dataIndex];
            return `${b.approved}/${b.expected} (${b.rate}%)`;
          },
        },
      },
    },
    scales: {
      x: { max: 100, grid: { color: '#F4F4F5' }, ticks: { callback: (v: number | string) => `${v}%` } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  // Single-barangay: Document Type Breakdown chart
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
        <div className="ms-auto">
          <button
            onClick={() => selectedBarangay && exportBarangayProfileToCsv(selectedBarangay, currentYear, compliance.matrixData, compliance.barangayPerennialSummary)}
            disabled={!selectedBarangay}
            title={!selectedBarangay ? "Select a barangay to export its profile" : ""}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              background: !selectedBarangay ? '#F4F4F5' : '#FFFFFF', 
              color: !selectedBarangay ? '#A1A1AA' : '#16A34A',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              border: !selectedBarangay ? '1px solid #E4E4E7' : '1px solid #BBF7D0', 
              cursor: !selectedBarangay ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (selectedBarangay) { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#FFFFFF'; } }}
            onMouseLeave={e => { if (selectedBarangay) { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#16A34A'; } }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
            Export Barangay Profile CSV
          </button>
        </div>
      </div>

      {/* 1 ── Row 1: KPI Stat Cards */}
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

      {/* 2 ── Row 2: Doughnut + Compliance Ranking (or Doc Type Breakdown) */}
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
              subtitle={rankingSortDir === 'desc' ? 'Top 5 — green ≥ 80%, amber ≥ 50%, red < 50%' : 'Bottom 5 — green ≥ 80%, amber ≥ 50%, red < 50%'}
              headerRight={
                <SortToggle
                  direction={rankingSortDir}
                  onToggle={() => setRankingSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                />
              }
            >
              <div style={{ height: '300px' }}>
                <Bar data={barangayBarData} options={barangayBarOptions} />
              </div>
            </AnalyticsCard>
          )}
        </Col>
      </Row>

      {/* 3 ── Row 3: Document Type Compliance + Submission Trend */}
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
    </>
  );
};

export default AdminAnalyticsSection;
