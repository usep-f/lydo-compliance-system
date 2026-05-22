import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Form } from 'react-bootstrap';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.color = '#71717A';

/**
 * Admin Analytics Section — Chart.js powered compliance dashboard.
 * Layout: KPI Stats → Doughnut+Bar → Matrix → DocType+Trend → Perennials
 */
const AdminAnalyticsSection: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear] = useState(currentYear);

  const { pending = [], history = [] } = useSubmissions(undefined, true);
  const approved = useMemo(
    () => history.filter((s) => s.status === 'approved' || (!s.status && s.approvedAt)), 
    [history]
  );
  const compliance = useComplianceData(selectedYear, pending, approved, BARANGAYS);

  // Per-barangay perennial filter
  const [selectedPerennialBarangay, setSelectedPerennialBarangay] = useState(BARANGAYS[0] || '');

  const selectedPerennial = useMemo(() => {
    const entry = compliance.barangayPerennialSummary.find(
      (c) => c.barangay === selectedPerennialBarangay
    );

    if (!entry) {
      return {
        resolutions: 0,
        accomplishmentsTotal: 0,
        categoryData: ACCOMPLISHMENT_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          count: 0,
        })),
      };
    }

    return entry;
  }, [compliance.barangayPerennialSummary, selectedPerennialBarangay]);

  // -----------------------------------------------------------------------
  // Compliance Matrix — Filter by doc type (now includes ASAP)
  // -----------------------------------------------------------------------
  const [matrixDocType, setMatrixDocType] = useState(ALL_UPLOAD_TYPES[0]?.id || '');

  const matrixForDocType = useMemo(() => {
    const cells = compliance.matrixData.filter((c) => c.docType === matrixDocType);
    const periods = [...new Set(cells.map((c) => c.period))];
    return { cells, periods };
  }, [compliance.matrixData, matrixDocType]);

  // -----------------------------------------------------------------------
  // Chart Data: Overall Compliance Doughnut
  // -----------------------------------------------------------------------
  const doughnutData = {
    labels: ['Approved', 'Pending', 'Missing'],
    datasets: [
      {
        data: [
          compliance.overallRate,
          Math.round(
            (compliance.pendingReviewCount /
              Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) *
            100
          ),
          Math.max(
            0,
            100 -
            compliance.overallRate -
            Math.round(
              (compliance.pendingReviewCount /
                Math.max(1, compliance.barangayRanking.reduce((s, b) => s + b.expected, 0))) *
              100
            )
          ),
        ],
        backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.raw}%`,
        },
      },
    },
  };

  // -----------------------------------------------------------------------
  // Chart Data: Barangay Compliance (Horizontal Bar)
  // -----------------------------------------------------------------------
  const top15 = compliance.barangayRanking.slice(0, 15);
  const barangayBarData = {
    labels: top15.map((b) => b.barangay.length > 20 ? b.barangay.slice(0, 18) + '...' : b.barangay),
    datasets: [
      {
        label: 'Compliance %',
        data: top15.map((b) => b.rate),
        backgroundColor: top15.map((b) =>
          b.rate >= 80 ? '#22C55E' : b.rate >= 50 ? '#F59E0B' : '#EF4444'
        ),
        borderRadius: 4,
        barThickness: 18,
      },
    ],
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
      x: {
        max: 100,
        grid: { color: '#F4F4F5' },
        ticks: { callback: (v: any) => `${v}%` },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  // -----------------------------------------------------------------------
  // Chart Data: Document Type Compliance (Grouped Bar)
  // -----------------------------------------------------------------------
  const docTypeBarData = {
    labels: compliance.docTypeCompliance.map((d) =>
      d.label.length > 25 ? d.label.slice(0, 22) + '...' : d.label
    ),
    datasets: [
      {
        label: 'Expected',
        data: compliance.docTypeCompliance.map((d) => d.expected),
        backgroundColor: '#E4E4E7',
        borderRadius: 4,
        barThickness: 24,
      },
      {
        label: 'Approved',
        data: compliance.docTypeCompliance.map((d) => d.approved),
        backgroundColor: '#4F46E5',
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  };

  const docTypeBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F4F4F5' }, beginAtZero: true },
    },
  };

  // -----------------------------------------------------------------------
  // Chart Data: Submission Trend (Line)
  // -----------------------------------------------------------------------
  const trendLineData = {
    labels: compliance.monthlyTrend.map((m) => m.month),
    datasets: [
      {
        label: 'Submitted',
        data: compliance.monthlyTrend.map((m) => m.submitted),
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Approved',
        data: compliance.monthlyTrend.map((m) => m.approved),
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const trendLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#F4F4F5' }, beginAtZero: true },
    },
  };



  // -----------------------------------------------------------------------
  // Render — New Layout Order:
  // 1. KPI Stat Cards
  // 2. Doughnut + Barangay Ranking
  // 3. Compliance Matrix (with ASAP in dropdown)
  // 4. Doc Type Compliance + Submission Trend
  // 5. Perennial Summary (Resolutions + Accomplishment Reports)
  // -----------------------------------------------------------------------
  return (
    <>
      {/* 1. KPI Stat Cards */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <StatCard title="Overall Compliance" value={`${compliance.overallRate}%`} variant="primary" />
        </Col>
        <Col md={3}>
          <StatCard
            title="Fully Compliant"
            value={`${compliance.fullyCompliantCount} / ${compliance.totalBarangays}`}
            variant="success"
          />
        </Col>
        <Col md={3}>
          <StatCard title="Overdue Submissions" value={compliance.overdueCount} variant="danger" />
        </Col>
        <Col md={3}>
          <StatCard title="Pending Review" value={compliance.pendingReviewCount} variant="warning" />
        </Col>
      </Row>

      {/* 2. Doughnut + Barangay Ranking (below stats, above matrix) */}
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                Overall Compliance
              </h6>
              <div style={{ height: '250px', position: 'relative' }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div
                  className="position-absolute top-50 start-50 translate-middle text-center"
                  style={{ pointerEvents: 'none', marginTop: '-15px' }}
                >
                  <div className="fw-bold text-dark" style={{ fontSize: '28px', lineHeight: 1 }}>
                    {compliance.overallRate}%
                  </div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>Compliant</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                Barangay Compliance Ranking
              </h6>
              <div style={{ height: '300px' }}>
                <Bar data={barangayBarData} options={barangayBarOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 3. Compliance Matrix (ASAP + Scheduled in dropdown) */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0" style={{ fontFamily: 'var(--font-headline)' }}>
              <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
                grid_on
              </span>
              Compliance Matrix
            </h5>
            <Form.Select
              value={matrixDocType}
              onChange={(e) => setMatrixDocType(e.target.value)}
              style={{ maxWidth: '340px' }}
            >
              <optgroup label="Scheduled Documents">
                {SCHEDULED_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ASAP Documents">
                {ASAP_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </optgroup>
            </Form.Select>
          </div>

          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-sm table-hover mb-0" style={{ fontSize: '12px' }}>
              <thead className="sticky-top bg-white">
                <tr>
                  <th className="fw-bold text-dark" style={{ minWidth: '160px' }}>Barangay</th>
                  {matrixForDocType.periods.map((p) => (
                    <th key={p} className="text-center" style={{ minWidth: '70px' }}>
                      {p === 'ASAP'
                        ? 'Status'
                        : formatPeriodLabel(p).replace(` ${selectedYear}`, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BARANGAYS.map((brgy) => (
                  <tr key={brgy}>
                    <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: '180px' }}>
                      {brgy}
                    </td>
                    {matrixForDocType.periods.map((period) => {
                      const cell = matrixForDocType.cells.find(
                        (c) => c.barangay === brgy && c.period === period
                      );
                      const status = cell?.status || 'not_due';
                      const colors: Record<string, { bg: string; icon: string }> = {
                        approved: { bg: '#F0FDF4', icon: '✅' },
                        pending: { bg: '#FFF7ED', icon: '🟡' },
                        missing: { bg: '#FEF2F2', icon: '🔴' },
                        not_due: { bg: '#F9FAFB', icon: '⚪' },
                      };
                      const c = colors[status];
                      return (
                        <td
                          key={period}
                          className="text-center"
                          style={{ backgroundColor: c.bg }}
                          title={`${brgy} — ${period === 'ASAP' ? 'ASAP' : formatPeriodLabel(period)}: ${status}`}
                        >
                          {c.icon}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex gap-4 mt-3 justify-content-center" style={{ fontSize: '12px' }}>
            <span>✅ Approved</span>
            <span>🟡 Pending</span>
            <span>🔴 Missing</span>
            <span>⚪ Not yet due</span>
          </div>
        </Card.Body>
      </Card>

      {/* 4. Doc Type Compliance + Submission Trend */}
      <Row className="mb-4 g-3">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                Document Type Compliance
              </h6>
              <div style={{ height: '280px' }}>
                <Bar data={docTypeBarData} options={docTypeBarOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                Submission Trend
              </h6>
              <div style={{ height: '280px' }}>
                <Line data={trendLineData} options={trendLineOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 5. Year-End Counts — Filtered by Barangay */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0" style={{ fontFamily: 'var(--font-headline)' }}>
              <span className="material-symbols-outlined me-2 text-primary" style={{ verticalAlign: 'middle' }}>
                analytics
              </span>
              Year-End Counts ({selectedYear})
            </h5>
            <Form.Select
              value={selectedPerennialBarangay}
              onChange={(e) => setSelectedPerennialBarangay(e.target.value)}
              style={{ maxWidth: '300px' }}
            >
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Form.Select>
          </div>

          {/* KPI cards for selected barangay */}
          <Row className="mb-4 g-3">
            <Col md={6}>
              <StatCard
                title="Resolutions"
                value={selectedPerennial.resolutions}
                variant="primary"
              />
            </Col>
            <Col md={6}>
              <StatCard
                title="Total Accomplishment Reports"
                value={selectedPerennial.accomplishmentsTotal}
                variant="info"
              />
            </Col>
          </Row>

          {/* Accomplishment breakdown */}
          <Row className="g-3">
            <Col md={12}>
              <Card className="border rounded h-100">
                <Card.Body className="p-3">
                  <h6 className="fw-bold mb-3" style={{ fontSize: '14px' }}>
                    Category Breakdown
                  </h6>
                  <div className="d-flex flex-column gap-2">
                    {selectedPerennial.categoryData.map((cat) => (
                      <div key={cat.id} className="d-flex align-items-center justify-content-between bg-light rounded-3 px-3 py-2">
                        <span className="text-dark" style={{ fontSize: '13px' }}>{cat.label}</span>
                        <span
                          className={`badge ${cat.count > 0 ? 'bg-primary' : 'bg-secondary bg-opacity-25 text-muted'}`}
                          style={{ minWidth: '36px', fontSize: '13px' }}
                        >
                          {cat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
};

export default AdminAnalyticsSection;
