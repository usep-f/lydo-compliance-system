import React, { useState, useMemo, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Card } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { BARANGAYS } from '../../constants/barangays';
import {
  ACCOMPLISHMENT_CATEGORIES,
  type HistoricalSubmission,
  type PendingSubmission,
} from '../../constants/submissionTypes';
import type { ComplianceData } from '../../hooks/useComplianceData';
import { generateFormalPdfReport, type PdfChartFigure, type ReportProfileType } from '../../utils/pdfReportUtils';
import { exportAnalyticsSummaryCsv, exportFilteredSubmissionsCsv } from '../../utils/csvUtils';
import { useToast } from '../../context/ToastContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/* ─────────────────────────────────────────────
   Props & Interfaces
───────────────────────────────────────────── */

interface ExportReportModalProps {
  show: boolean;
  onHide: () => void;
  adminName: string;
  compliance: ComplianceData;
  pendingSubmissions: PendingSubmission[];
  historySubmissions: HistoricalSubmission[];
  currentYear: number;
}

interface ChartRefHolder {
  toBase64Image: () => string;
}

interface SectionItem {
  key: 'kpis' | 'charts' | 'matrix' | 'submissions';
  title: string;
  desc: string;
  icon: string;
  color: string;
  bgColor: string;
}

const SECTION_ITEMS: SectionItem[] = [
  {
    key: 'kpis',
    title: 'Executive KPIs',
    desc: 'Scorecard & rates',
    icon: 'speed',
    color: '#006EB7',
    bgColor: '#E0F2FE',
  },
  {
    key: 'charts',
    title: 'Visual Charts',
    desc: 'Gauges & trends',
    icon: 'monitoring',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
  },
  {
    key: 'matrix',
    title: 'Compliance Matrix',
    desc: 'Document checklist',
    icon: 'grid_on',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    key: 'submissions',
    title: 'Submission Logs',
    desc: 'Audit trail history',
    icon: 'history_edu',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
];

/* ─────────────────────────────────────────────
   Sub-components (Anti-Monolith & High-Polish)
───────────────────────────────────────────── */

/** Report Profile Preset Selector */
const ProfilePresetCard: React.FC<{
  selectedProfile: ReportProfileType;
  onSelectProfile: (p: ReportProfileType) => void;
}> = ({ selectedProfile, onSelectProfile }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center justify-content-between mb-2">
      <div className="d-flex align-items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          auto_awesome
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Report Profile &amp; Layout Engine
        </span>
      </div>
      <span className="text-muted" style={{ fontSize: '11px' }}>
        Select preset layout
      </span>
    </div>

    <Row className="g-2">
      <Col md={4}>
        <div
          onClick={() => onSelectProfile('executive')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'executive' ? '2px solid #006EB7' : '1px solid #E2E8F0',
            background: selectedProfile === 'executive' ? '#F0F7FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'executive' ? '0 2px 8px rgba(0, 110, 183, 0.12)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-primary" style={{ fontSize: '9.5px', fontWeight: 600 }}>Portrait · 1–2 Pages</span>
            {selectedProfile === 'executive' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Executive Briefing</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            High-impact scorecards, macro donut gauge, and comparative rankings for municipal leadership.
          </div>
        </div>
      </Col>

      <Col md={4}>
        <div
          onClick={() => onSelectProfile('dossier')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'dossier' ? '2px solid #006EB7' : '1px solid #E2E8F0',
            background: selectedProfile === 'dossier' ? '#F0F7FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'dossier' ? '0 2px 8px rgba(0, 110, 183, 0.12)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-dark" style={{ fontSize: '9.5px', fontWeight: 600 }}>Landscape · Multi-Page</span>
            {selectedProfile === 'dossier' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Full Audit Dossier</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            Comprehensive audit with hybrid charts, denial analysis, accomplishment areas, and submission logs.
          </div>
        </div>
      </Col>

      <Col md={4}>
        <div
          onClick={() => onSelectProfile('custom')}
          role="button"
          tabIndex={0}
          className="p-2.5 h-100 position-relative transition-all"
          style={{
            borderRadius: '10px',
            border: selectedProfile === 'custom' ? '2px solid #006EB7' : '1px solid #E2E8F0',
            background: selectedProfile === 'custom' ? '#F0F7FF' : '#FFFFFF',
            boxShadow: selectedProfile === 'custom' ? '0 2px 8px rgba(0, 110, 183, 0.12)' : 'none',
            cursor: 'pointer',
            padding: '10px 12px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between mb-1">
            <span className="badge bg-secondary" style={{ fontSize: '9.5px', fontWeight: 600 }}>Custom Selection</span>
            {selectedProfile === 'custom' && (
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>check_circle</span>
            )}
          </div>
          <div className="fw-bold text-dark mb-1" style={{ fontSize: '12.5px' }}>Custom Modular</div>
          <div className="text-muted" style={{ fontSize: '10.5px', lineHeight: 1.35 }}>
            Fine-tune and toggle exact report sections and tables to customize the output document.
          </div>
        </div>
      </Col>
    </Row>
  </div>
);

/** Scope & Filter Settings Card */
const ScopeFilterCard: React.FC<{
  selectedBarangay: string;
  setSelectedBarangay: (v: string) => void;
  selectedYear: number;
  setSelectedYear: (v: number) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  currentYear: number;
}> = ({
  selectedBarangay,
  setSelectedBarangay,
  selectedYear,
  setSelectedYear,
  statusFilter,
  setStatusFilter,
  currentYear,
}) => (
  <Card className="border mb-3" style={{ borderRadius: '12px', background: '#F8FAFC', borderColor: '#E2E8F0' }}>
    <Card.Body className="p-3">
      <div className="d-flex align-items-center gap-2 mb-2 pb-1 border-bottom" style={{ borderColor: '#E2E8F0' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          tune
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Scope &amp; Data Filters
        </span>
      </div>
      <Row className="g-2">
        <Col md={5}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Target Scope (Barangay)
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              style={{ borderRadius: '8px', fontSize: '12.5px', borderColor: '#CBD5E1' }}
            >
              <option value="all">All Barangays (Municipal Overview)</option>
              {BARANGAYS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Calendar Year
            </Form.Label>
            <Form.Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ borderRadius: '8px', fontSize: '12.5px', borderColor: '#CBD5E1' }}
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
              <option value={currentYear - 2}>{currentYear - 2}</option>
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>
              Log Status Filter
            </Form.Label>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: '8px', fontSize: '12.5px', borderColor: '#CBD5E1' }}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Only</option>
              <option value="denied">Denied Only</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

/** Interactive Section Selection Grid */
const SectionSelectionGrid: React.FC<{
  sections: { kpis: boolean; charts: boolean; matrix: boolean; submissions: boolean };
  onToggle: (key: 'kpis' | 'charts' | 'matrix' | 'submissions') => void;
}> = ({ sections, onToggle }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center justify-content-between mb-2">
      <div className="d-flex align-items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          checklist
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Modular Report Sections (PDF)
        </span>
      </div>
      <span className="text-muted" style={{ fontSize: '11px' }}>
        Click card to toggle inclusion
      </span>
    </div>

    <Row className="g-2">
      {SECTION_ITEMS.map((item) => {
        const isChecked = sections[item.key];
        return (
          <Col xs={6} md={3} key={item.key}>
            <div
              onClick={() => onToggle(item.key)}
              role="button"
              tabIndex={0}
              className="p-2 h-100 position-relative transition-all"
              style={{
                borderRadius: '10px',
                border: isChecked ? '1.5px solid #006EB7' : '1px solid #E2E8F0',
                background: isChecked ? '#F0F7FF' : '#FFFFFF',
                boxShadow: isChecked ? '0 2px 6px rgba(0, 110, 183, 0.12)' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="d-flex align-items-start justify-content-between mb-1">
                <div
                  className="d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: '28px', height: '28px', background: item.bgColor, color: item.color }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>
                    {item.icon}
                  </span>
                </div>
                <Form.Check
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Controlled by container onClick
                  style={{ pointerEvents: 'none' }}
                />
              </div>
              <div className="fw-bold text-dark" style={{ fontSize: '12px' }}>
                {item.title}
              </div>
              <div className="text-muted" style={{ fontSize: '10.5px' }}>
                {item.desc}
              </div>
            </div>
          </Col>
        );
      })}
    </Row>
  </div>
);

/** Status & Summary Ribbon */
const SummaryRibbon: React.FC<{
  isAll: boolean;
  selectedBarangay: string;
  matchCount: number;
  selectedProfile: ReportProfileType;
}> = ({ isAll, selectedBarangay, matchCount, selectedProfile }) => (
  <div
    className="d-flex align-items-center justify-content-between p-2 px-3 rounded"
    style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}
  >
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className="badge" style={{ background: '#006EB7', color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}>
        {isAll ? 'Scope: All Barangays' : `Scope: ${selectedBarangay}`}
      </span>
      <span className="badge bg-secondary" style={{ fontSize: '11px' }}>
        {selectedProfile === 'dossier' ? 'Orientation: Landscape' : 'Orientation: Portrait'}
      </span>
      <span>
        <strong>Matching Records:</strong> {matchCount} submissions
      </span>
    </div>
    <span className="text-muted d-inline-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#16A34A' }}>
        verified_user
      </span>
      Client-Side Secure Generation
    </span>
  </div>
);

/* ─────────────────────────────────────────────
   Main ExportReportModal Component
───────────────────────────────────────────── */

export default function ExportReportModal({
  show,
  onHide,
  adminName,
  compliance,
  pendingSubmissions,
  historySubmissions,
  currentYear,
}: ExportReportModalProps) {
  const { addToast } = useToast();

  // Profile State
  const [selectedProfile, setSelectedProfile] = useState<ReportProfileType>('executive');

  // Scope & Filter States
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modular Section Toggles
  const [sections, setSections] = useState({
    kpis: true,
    charts: true,
    matrix: true,
    submissions: false,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Chart Refs for 2x DPI snapshot capture across all 7 analytics graphs
  const chart1Ref = useRef<ChartRefHolder | null>(null); // Overall Compliance Donut
  const chart2Ref = useRef<ChartRefHolder | null>(null); // Annual Activity Timeline (Line)
  const chart3Ref = useRef<ChartRefHolder | null>(null); // Document Type Compliance (Bar)
  const chart4Ref = useRef<ChartRefHolder | null>(null); // Denial Reasons Breakdown (Donut)
  const chart5Ref = useRef<ChartRefHolder | null>(null); // Youth Accomplishments by Area (Bar)
  const chart6Ref = useRef<ChartRefHolder | null>(null); // Accomplishment Report Category Breakdown (Donut)
  const chart7Ref = useRef<ChartRefHolder | null>(null); // Barangay Compliance Ranking (Bar)

  const handleSelectProfile = (profile: ReportProfileType) => {
    setSelectedProfile(profile);
    if (profile === 'executive') {
      setSections({ kpis: true, charts: true, matrix: true, submissions: false });
    } else if (profile === 'dossier') {
      setSections({ kpis: true, charts: true, matrix: true, submissions: true });
    }
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    if (selectedProfile !== 'custom') {
      setSelectedProfile('custom');
    }
  };

  // Filtered submissions list
  const filteredSubmissions = useMemo(() => {
    const all = [...pendingSubmissions, ...historySubmissions];
    return all.filter((s) => {
      const matchBrgy = selectedBarangay === 'all' || s.barangay === selectedBarangay;
      const matchYear = !s.year || s.year === selectedYear;
      const anySub = s as unknown as { status?: string; approvedAt?: unknown; deniedAt?: unknown };
      const computedStatus = anySub.status || (anySub.approvedAt ? 'approved' : anySub.deniedAt ? 'denied' : 'pending');
      const matchStatus = statusFilter === 'all' || computedStatus === statusFilter;
      return matchBrgy && matchYear && matchStatus;
    });
  }, [pendingSubmissions, historySubmissions, selectedBarangay, selectedYear, statusFilter]);

  const isAll = selectedBarangay === 'all';

  // ── Chart 1 Data: Gauge / Donut (Approved vs. Pending vs. Overdue vs. Denied)
  const chart1Data: ChartData<'doughnut'> = useMemo(() => {
    const totalExpected = isAll
      ? compliance.barangayRanking.reduce((s, b) => s + b.expected, 0)
      : (compliance.barangayRanking.find((b) => b.barangay === selectedBarangay)?.expected ?? 1);

    const rate = isAll
      ? compliance.overallRate
      : (compliance.barangayRanking.find((b) => b.barangay === selectedBarangay)?.rate ?? 0);

    const pendingCount = isAll
      ? pendingSubmissions.length
      : pendingSubmissions.filter((p) => p.barangay === selectedBarangay).length;

    const deniedCount = isAll
      ? historySubmissions.filter((s) => s.status === 'denied').length
      : historySubmissions.filter((s) => s.barangay === selectedBarangay && s.status === 'denied').length;

    const pendingPct = Math.round((pendingCount / Math.max(1, totalExpected)) * 100);
    const deniedPct = Math.round((deniedCount / Math.max(1, totalExpected)) * 100);
    const overduePct = Math.max(0, 100 - rate - pendingPct - deniedPct);

    return {
      labels: ['Approved', 'Pending Review', 'Pending Requirement', 'Denied / Returned'],
      datasets: [
        {
          data: [rate, pendingPct, overduePct, deniedPct],
          backgroundColor: ['#10B981', '#F59E0B', '#E2E8F0', '#E11D48'],
          hoverBackgroundColor: ['#059669', '#D97706', '#CBD5E1', '#BE123C'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [isAll, compliance, selectedBarangay, pendingSubmissions, historySubmissions]);

  // ── Chart 2 Data: Activity Trend Line (Submitted vs. Approved vs. Denied)
  const chart2Data: ChartData<'line'> = useMemo(() => {
    return {
      labels: compliance.monthlyTrend.map((m) => m.month),
      datasets: [
        {
          label: 'Submitted',
          data: compliance.monthlyTrend.map((m) => m.submitted),
          borderColor: '#006EB7',
          backgroundColor: 'rgba(0, 110, 183, 0.09)',
          fill: true,
          tension: 0.38,
          borderWidth: 2.4,
          pointRadius: 3.5,
          pointBackgroundColor: '#006EB7',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
        },
        {
          label: 'Approved',
          data: compliance.monthlyTrend.map((m) => m.approved),
          borderColor: '#10B981',
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          tension: 0.38,
          borderWidth: 2.2,
          pointRadius: 3.5,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
        },
        {
          label: 'Denied',
          data: compliance.monthlyTrend.map((m) => m.denied),
          borderColor: '#F43F5E',
          backgroundColor: 'transparent',
          borderDash: [3, 3],
          tension: 0.38,
          borderWidth: 2,
          pointRadius: 3.5,
          pointBackgroundColor: '#F43F5E',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [compliance.monthlyTrend]);

  // ── Chart 3 Data: Document Type Compliance (Submitted, Approved, Denied across document types)
  const chart3Data: ChartData<'bar'> = useMemo(() => {
    const list = compliance.docTypeCompliance;
    return {
      labels: list.map((d) => (d.label.length > 20 ? `${d.label.slice(0, 18)}...` : d.label)),
      datasets: [
        {
          label: 'Submitted',
          data: list.map((d) => d.submitted ?? (d.approved + (d.denied ?? 0))),
          backgroundColor: '#006EB7',
          borderRadius: 3,
        },
        {
          label: 'Approved',
          data: list.map((d) => d.approved),
          backgroundColor: '#10B981',
          borderRadius: 3,
        },
        {
          label: 'Denied',
          data: list.map((d) => d.denied ?? 0),
          backgroundColor: '#F43F5E',
          borderRadius: 3,
        },
      ],
    };
  }, [compliance.docTypeCompliance]);

  // ── Chart 4 Data: Denial Breakdown Doughnut (Categorical distribution)
  const chart4Data: ChartData<'doughnut'> = useMemo(() => {
    const activeShares = compliance.denialReasonShare.filter((d) => d.count > 0);

    if (activeShares.length === 0) {
      return {
        labels: ['100% Acceptance (Zero Denials)'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#10B981'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      };
    }

    const shortLabels = activeShares.map((d) => {
      if (d.label.includes('Signature')) return 'Signatures';
      if (d.label.includes('Incomplete') || d.label.includes('Attachment')) return 'Missing Docs';
      if (d.label.includes('Template') || d.label.includes('Format')) return 'Wrong Template';
      if (d.label.includes('Period') || d.label.includes('Year')) return 'Invalid Period';
      if (d.label.includes('Inaccuracies') || d.label.includes('Discrepancies')) return 'Data Discrepancy';
      if (d.label.includes('Other')) return 'Other Reasons';
      return d.label.length > 18 ? `${d.label.slice(0, 16)}...` : d.label;
    });

    return {
      labels: shortLabels,
      datasets: [
        {
          data: activeShares.map((d) => d.count),
          backgroundColor: ['#E11D48', '#F97316', '#F59E0B', '#6366F1', '#8B5CF6', '#64748B'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [compliance.denialReasonShare]);

  // ── Chart 5 Data: Youth Accomplishments by Area (Submitted, Approved, Denied)
  const chart5Data: ChartData<'bar'> = useMemo(() => {
    const shortCategoryLabels: Record<string, string> = {
      'Active Citizenship': 'Citizenship',
      'Agriculture': 'Agriculture',
      'Economic Empowerment': 'Economics',
      'Education': 'Education',
      'Environment': 'Environment',
      'Global Mobility': 'Global Mobility',
      'Governance': 'Governance',
      'Health': 'Health',
      'Peace Building and Security': 'Peace & Sec',
      'Social Inclusion and Equity': 'Inclusion',
    };

    const categories = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
      if (isAll) {
        const item = compliance.overallPerennialSummary.items.find((i) => i.id === cat.id);
        const approved = item?.approved ?? 0;
        const denied = item?.denied ?? 0;
        const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
        return { label: shortCategoryLabels[cat.label] || cat.label, submitted, approved, denied };
      }
      const entry = compliance.barangayPerennialSummary.find((s) => s.barangay === selectedBarangay);
      const item = entry?.categoryData.find((c) => c.id === cat.id);
      const approved = item?.approved ?? 0;
      const denied = item?.denied ?? 0;
      const submitted = item?.submitted ?? (approved + (item?.pending ?? 0) + denied);
      return { label: shortCategoryLabels[cat.label] || cat.label, submitted, approved, denied };
    });

    return {
      labels: categories.map((c) => c.label),
      datasets: [
        {
          label: 'Submitted',
          data: categories.map((c) => c.submitted),
          backgroundColor: '#006EB7',
          borderRadius: 3,
        },
        {
          label: 'Approved',
          data: categories.map((c) => c.approved),
          backgroundColor: '#10B981',
          borderRadius: 3,
        },
        {
          label: 'Denied',
          data: categories.map((c) => c.denied),
          backgroundColor: '#F43F5E',
          borderRadius: 3,
        },
      ],
    };
  }, [isAll, selectedBarangay, compliance]);

  // ── Chart 6 Data: Accomplishment Report Category Breakdown (Share of approved accomplishments)
  const chart6Data: ChartData<'doughnut'> = useMemo(() => {
    const active = compliance.accomplishmentApprovalShare.filter((s) => s.approved > 0);
    if (active.length === 0) {
      return {
        labels: ['No Approved Filings'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#CBD5E1'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      };
    }

    const shortLabels = active.map((s) => {
      if (s.label.includes('Citizenship')) return 'Citizenship';
      if (s.label.includes('Agriculture')) return 'Agriculture';
      if (s.label.includes('Empowerment')) return 'Economics';
      if (s.label.includes('Education')) return 'Education';
      if (s.label.includes('Environment')) return 'Environment';
      if (s.label.includes('Mobility')) return 'Mobility';
      if (s.label.includes('Governance')) return 'Governance';
      if (s.label.includes('Health')) return 'Health';
      if (s.label.includes('Security')) return 'Peace & Sec';
      if (s.label.includes('Inclusion')) return 'Inclusion';
      return s.label.length > 16 ? `${s.label.slice(0, 14)}...` : s.label;
    });

    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#14B8A6',
      '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#06B6D4',
    ];

    return {
      labels: shortLabels,
      datasets: [
        {
          data: active.map((s) => s.approved),
          backgroundColor: colors.slice(0, active.length),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [compliance.accomplishmentApprovalShare]);

  // ── Chart 7 Data: Barangay Compliance Ranking Bar Chart
  const chart7Data: ChartData<'bar'> = useMemo(() => {
    const sorted = [...compliance.barangayRanking].sort((a, b) => b.rate - a.rate);
    const top = sorted.slice(0, 6); // Top 6 ranked barangays for executive clarity
    return {
      labels: top.map((b) => (b.barangay.length > 20 ? `${b.barangay.slice(0, 18)}...` : b.barangay)),
      datasets: [
        {
          label: 'Compliance Rate (%)',
          data: top.map((b) => b.rate),
          backgroundColor: top.map((b) => (b.rate >= 80 ? '#10B981' : b.rate >= 50 ? '#F59E0B' : '#F43F5E')),
          borderRadius: 3,
          barPercentage: 0.72,
          categoryPercentage: 0.85,
        },
      ],
    };
  }, [compliance.barangayRanking]);

  const offscreenDoughnutOptions: ChartOptions<'doughnut'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 8.5, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenLineOptions: ChartOptions<'line'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 8 } },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 8 }, precision: 0 },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 8.5, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenDocTypeBarOptions: ChartOptions<'bar'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 7.2 }, maxRotation: 20, minRotation: 0 },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 8 }, precision: 0 },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 8.5, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenDenialDoughnutOptions: ChartOptions<'doughnut'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 6,
          font: { size: 7.5, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenYouthBarOptions: ChartOptions<'bar'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 7.2 }, maxRotation: 20, minRotation: 0 },
      },
      y: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 8 }, precision: 0 },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 8.5, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenAccDoughnutOptions: ChartOptions<'doughnut'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 8,
          font: { size: 8, weight: 'bold' as const },
        },
      },
    },
  };

  const offscreenRankingBarOptions: ChartOptions<'bar'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: {
        grid: { color: '#F1F5F9' },
        ticks: { font: { size: 7.8 }, stepSize: 25 },
        max: 100,
        beginAtZero: true,
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 8.5, weight: 'bold' as const } },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  /* ─────────────────────────────────────────────
     Action Handlers
  ───────────────────────────────────────────── */

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const figures: PdfChartFigure[] = [];

      if (sections.charts) {
        if (chart1Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Overall Compliance Status Distribution'
              : `Compliance Status Distribution — ${selectedBarangay}`,
            subtitle: 'Share of approved, pending, overdue, and denied submissions',
            dataUrl: chart1Ref.current.toBase64Image(),
            heightPt: 145,
          });
        }
        if (chart2Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Annual Submission Activity Timeline'
              : `Submission Activity Timeline — ${selectedBarangay}`,
            subtitle: 'Tracking submitted, approved, and denied filing trends',
            dataUrl: chart2Ref.current.toBase64Image(),
            heightPt: 145,
          });
        }
        if (chart3Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Document Type Compliance Breakdown'
              : `Document Type Compliance — ${selectedBarangay}`,
            subtitle: 'Submission volume across scheduled, ASAP, resolutions, and accomplishment categories',
            dataUrl: chart3Ref.current.toBase64Image(),
            heightPt: 140,
          });
        }
        if (chart4Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Denial Reason Categorical Distribution'
              : `Denial Breakdown — ${selectedBarangay}`,
            subtitle: 'Primary causes of document submission denial and return',
            dataUrl: chart4Ref.current.toBase64Image(),
            heightPt: 140,
          });
        }
        if (chart5Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Youth Accomplishment Submissions by Priority Area'
              : `Youth Accomplishments — ${selectedBarangay}`,
            subtitle: 'Submission volume across 10 statutory youth development areas',
            dataUrl: chart5Ref.current.toBase64Image(),
            heightPt: 140,
          });
        }
        if (chart6Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Accomplishment Report Category Breakdown'
              : `Accomplishment Share — ${selectedBarangay}`,
            subtitle: 'Share of approved accomplishment reports across youth areas',
            dataUrl: chart6Ref.current.toBase64Image(),
            heightPt: 140,
          });
        }
        if (chart7Ref.current?.toBase64Image) {
          figures.push({
            title: 'Barangay Compliance Performance Ranking',
            subtitle: 'Comparative compliance rate ranking across barangays',
            dataUrl: chart7Ref.current.toBase64Image(),
            heightPt: 140,
          });
        }
      }

      await generateFormalPdfReport({
        year: selectedYear,
        scope: selectedBarangay,
        profile: selectedProfile,
        orientation: selectedProfile === 'dossier' ? 'landscape' : 'portrait',
        adminName,
        sections,
        charts: figures,
        compliance,
        submissions: filteredSubmissions,
      });

      addToast('Official compliance PDF report successfully generated!', 'success');
    } catch (err) {
      console.error('Error generating PDF report:', err);
      addToast('Failed to generate PDF report. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportAnalyticsCsv = () => {
    try {
      exportAnalyticsSummaryCsv(selectedYear, selectedBarangay, compliance);
      addToast('Analytics summary CSV downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error exporting analytics CSV:', err);
      addToast('Failed to export analytics CSV.', 'error');
    }
  };

  const handleExportSubmissionsCsv = () => {
    try {
      const suffix = isAll ? `All_${selectedYear}` : `${selectedBarangay.replace(/\s+/g, '_')}_${selectedYear}`;
      exportFilteredSubmissionsCsv(filteredSubmissions, suffix);
      addToast('Submission logs CSV downloaded successfully.', 'success');
    } catch (err) {
      console.error('Error exporting submissions CSV:', err);
      addToast('Failed to export submission logs CSV.', 'error');
    }
  };

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        size="lg"
        centered
        backdrop="static"
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        {/* Header with LYDO Deep Brand Gradient */}
        <div
          style={{
            background: 'linear-gradient(135deg, #00426E 0%, #006EB7 100%)',
            padding: '20px 24px',
            position: 'relative',
          }}
        >
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontSize: '26px', fontVariationSettings: "'FILL' 1" }}
                >
                  summarize
                </span>
              </div>
              <div>
                <Modal.Title
                  style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-headline)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Export &amp; Report Generator Hub
                </Modal.Title>
                <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', fontFamily: 'var(--font-body)' }}>
                  Compile official government compliance dossiers and structured data archives
                </div>
              </div>
            </div>

            <Button
              variant="link"
              onClick={onHide}
              className="p-1 text-white text-decoration-none d-flex align-items-center justify-content-center"
              style={{
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                background: 'rgba(255, 255, 255, 0.1)',
                transition: 'background 0.15s ease',
              }}
              title="Close modal"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </Button>
          </div>
        </div>

        <Modal.Body className="p-4" style={{ background: '#FFFFFF' }}>
          {/* 1. Report Profile Preset Selection */}
          <ProfilePresetCard
            selectedProfile={selectedProfile}
            onSelectProfile={handleSelectProfile}
          />

          {/* 2. Scope & Filter Controls */}
          <ScopeFilterCard
            selectedBarangay={selectedBarangay}
            setSelectedBarangay={setSelectedBarangay}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            currentYear={currentYear}
          />

          {/* 3. Interactive Modular Section Toggles */}
          <SectionSelectionGrid sections={sections} onToggle={toggleSection} />

          {/* 4. Records preview & Security status */}
          <SummaryRibbon
            isAll={isAll}
            selectedBarangay={selectedBarangay}
            matchCount={filteredSubmissions.length}
            selectedProfile={selectedProfile}
          />
        </Modal.Body>

        <Modal.Footer
          style={{
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            padding: '14px 24px',
          }}
        >
          <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted small fw-semibold d-none d-sm-inline" style={{ fontSize: '12px' }}>
                Spreadsheets:
              </span>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={handleExportAnalyticsCsv}
                className="d-inline-flex align-items-center gap-1 shadow-none"
                style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  table_chart
                </span>
                Analytics CSV
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleExportSubmissionsCsv}
                className="d-inline-flex align-items-center gap-1 shadow-none"
                style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 600 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  receipt_long
                </span>
                Submissions CSV
              </Button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="light"
                size="sm"
                onClick={onHide}
                className="border"
                style={{ borderRadius: '8px', fontSize: '12.5px', fontWeight: 500, color: '#334155' }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="d-inline-flex align-items-center gap-2 px-3 shadow-sm"
                style={{
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #006EB7 0%, #00528A 100%)',
                  border: 'none',
                }}
              >
                {isGeneratingPdf ? (
                  <>
                    <Spinner size="sm" animation="border" />
                    <span>Compiling PDF...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      picture_as_pdf
                    </span>
                    <span>Download PDF Report</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>

      {/* ─────────────────────────────────────────────
         Offscreen Hidden Canvas Container for 2x DPI Chart Snapshots
      ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          height: '400px',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div style={{ width: '400px', height: '260px' }}>
          <Doughnut
            ref={chart1Ref as unknown as React.RefObject<ChartJS<'doughnut'>>}
            data={chart1Data}
            options={offscreenDoughnutOptions}
            width={400}
            height={260}
          />
        </div>
        <div style={{ width: '720px', height: '280px' }}>
          <Line
            ref={chart2Ref as unknown as React.RefObject<ChartJS<'line'>>}
            data={chart2Data}
            options={offscreenLineOptions}
            width={720}
            height={280}
          />
        </div>
        <div style={{ width: '720px', height: '280px' }}>
          <Bar
            ref={chart3Ref as unknown as React.RefObject<ChartJS<'bar'>>}
            data={chart3Data}
            options={offscreenDocTypeBarOptions}
            width={720}
            height={280}
          />
        </div>
        <div style={{ width: '400px', height: '260px' }}>
          <Doughnut
            ref={chart4Ref as unknown as React.RefObject<ChartJS<'doughnut'>>}
            data={chart4Data}
            options={offscreenDenialDoughnutOptions}
            width={400}
            height={260}
          />
        </div>
        <div style={{ width: '720px', height: '280px' }}>
          <Bar
            ref={chart5Ref as unknown as React.RefObject<ChartJS<'bar'>>}
            data={chart5Data}
            options={offscreenYouthBarOptions}
            width={720}
            height={280}
          />
        </div>
        <div style={{ width: '400px', height: '260px' }}>
          <Doughnut
            ref={chart6Ref as unknown as React.RefObject<ChartJS<'doughnut'>>}
            data={chart6Data}
            options={offscreenAccDoughnutOptions}
            width={400}
            height={260}
          />
        </div>
        <div style={{ width: '640px', height: '220px' }}>
          <Bar
            ref={chart7Ref as unknown as React.RefObject<ChartJS<'bar'>>}
            data={chart7Data}
            options={offscreenRankingBarOptions}
            width={640}
            height={220}
          />
        </div>
      </div>
    </>
  );
}
