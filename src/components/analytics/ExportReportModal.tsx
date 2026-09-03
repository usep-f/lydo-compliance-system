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
import { Doughnut, Bar } from 'react-chartjs-2';
import { BARANGAYS } from '../../constants/barangays';
import {
  ACCOMPLISHMENT_CATEGORIES,
  type HistoricalSubmission,
  type PendingSubmission,
} from '../../constants/submissionTypes';
import type { ComplianceData } from '../../hooks/useComplianceData';
import { generateFormalPdfReport, type PdfChartFigure } from '../../utils/pdfReportUtils';
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

/** Signatory Customization Card */
const SignatoryCard: React.FC<{
  preparedBy: string;
  setPreparedBy: (v: string) => void;
  approvedBy: string;
  setApprovedBy: (v: string) => void;
  approverTitle: string;
  setApproverTitle: (v: string) => void;
}> = ({ preparedBy, setPreparedBy, approvedBy, setApprovedBy, approverTitle, setApproverTitle }) => (
  <Card className="border mb-3" style={{ borderRadius: '12px', background: '#FFFFFF', borderColor: '#E2E8F0' }}>
    <Card.Body className="p-3">
      <div className="d-flex align-items-center gap-2 mb-2 pb-1 border-bottom" style={{ borderColor: '#E2E8F0' }}>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>
          signature
        </span>
        <span className="fw-bold" style={{ fontSize: '13px', color: '#1E293B', fontFamily: 'var(--font-headline)' }}>
          Official Signatories &amp; Certification
        </span>
      </div>
      <Row className="g-2">
        <Col md={4}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', color: '#52525B', fontWeight: 600 }}>
              Prepared By (Admin)
            </Form.Label>
            <Form.Control
              size="sm"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Admin Full Name"
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', color: '#52525B', fontWeight: 600 }}>
              Noted &amp; Approved By
            </Form.Label>
            <Form.Control
              size="sm"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Official Approver Name"
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label className="mb-1" style={{ fontSize: '11.5px', color: '#52525B', fontWeight: 600 }}>
              Approver Designation
            </Form.Label>
            <Form.Control
              size="sm"
              value={approverTitle}
              onChange={(e) => setApproverTitle(e.target.value)}
              placeholder="e.g. Local Youth Development Officer"
              style={{ borderRadius: '8px', fontSize: '12px', borderColor: '#CBD5E1' }}
            />
          </Form.Group>
        </Col>
      </Row>
    </Card.Body>
  </Card>
);

/** Status & Summary Ribbon */
const SummaryRibbon: React.FC<{
  isAll: boolean;
  selectedBarangay: string;
  matchCount: number;
}> = ({ isAll, selectedBarangay, matchCount }) => (
  <div
    className="d-flex align-items-center justify-content-between p-2 px-3 rounded"
    style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}
  >
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <span className="badge" style={{ background: '#006EB7', color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}>
        {isAll ? 'Scope: All Barangays' : `Scope: ${selectedBarangay}`}
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

  // Scope & Filter States
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Signatory States
  const [preparedBy, setPreparedBy] = useState<string>(adminName || 'Admin');
  const [approvedBy, setApprovedBy] = useState<string>('Local Youth Development Officer');
  const [approverTitle, setApproverTitle] = useState<string>('LYDO Head / Officer-in-Charge');

  // Modular Section Toggles
  const [sections, setSections] = useState({
    kpis: true,
    charts: true,
    matrix: true,
    submissions: true,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Chart Refs for 2x DPI snapshot capture
  const chart1Ref = useRef<ChartRefHolder | null>(null);
  const chart2Ref = useRef<ChartRefHolder | null>(null);
  const chart3Ref = useRef<ChartRefHolder | null>(null);

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
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

  // Chart 1 Data: Gauge / Donut
  const chart1Data: ChartData<'doughnut'> = useMemo(() => {
    if (isAll) {
      const totalExpected = compliance.barangayRanking.reduce((s, b) => s + b.expected, 0);
      const pendingPct = Math.round((pendingSubmissions.length / Math.max(1, totalExpected)) * 100);
      const overduePct = Math.max(0, 100 - compliance.overallRate - pendingPct);
      return {
        labels: ['Approved', 'Pending Review', 'Missing / Overdue'],
        datasets: [
          {
            data: [compliance.overallRate, pendingPct, overduePct],
            backgroundColor: ['#16A34A', '#F59E0B', '#EF4444'],
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      };
    }
    const bData = compliance.barangayRanking.find((b) => b.barangay === selectedBarangay);
    const rate = bData?.rate ?? 0;
    const brgyPending = pendingSubmissions.filter((p) => p.barangay === selectedBarangay).length;
    const pendingPct = Math.round((brgyPending / Math.max(1, bData?.expected ?? 1)) * 100);
    const overduePct = Math.max(0, 100 - rate - pendingPct);
    return {
      labels: ['Approved', 'Pending Review', 'Missing / Overdue'],
      datasets: [
        {
          data: [rate, pendingPct, overduePct],
          backgroundColor: ['#16A34A', '#F59E0B', '#EF4444'],
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  }, [isAll, compliance, selectedBarangay, pendingSubmissions]);

  // Chart 2 Data: Bar (Ranking if All, or Category Status if Single)
  const chart2Data: ChartData<'bar'> = useMemo(() => {
    if (isAll) {
      return {
        labels: compliance.barangayRanking.map((b) => b.barangay),
        datasets: [
          {
            label: 'Compliance Rate (%)',
            data: compliance.barangayRanking.map((b) => b.rate),
            backgroundColor: '#006EB7',
            borderRadius: 4,
          },
        ],
      };
    }
    const cells = compliance.matrixData.filter((c) => c.barangay === selectedBarangay);
    const approved = cells.filter((c) => c.status === 'approved').length;
    const pending = cells.filter((c) => c.status === 'pending').length;
    const missing = cells.filter((c) => c.status === 'missing').length;
    return {
      labels: ['Approved', 'Pending Review', 'Missing / Overdue'],
      datasets: [
        {
          label: 'Documents Count',
          data: [approved, pending, missing],
          backgroundColor: ['#16A34A', '#F59E0B', '#EF4444'],
          borderRadius: 4,
        },
      ],
    };
  }, [isAll, compliance, selectedBarangay]);

  // Chart 3 Data: Trend if All, or Perennial Accomplishments if Single
  const chart3Data = useMemo(() => {
    if (isAll) {
      return {
        labels: compliance.monthlyTrend.map((m) => m.month),
        datasets: [
          {
            type: 'bar' as const,
            label: 'Approved Submissions',
            data: compliance.monthlyTrend.map((m) => m.approved),
            backgroundColor: '#16A34A',
            borderRadius: 4,
          },
          {
            type: 'bar' as const,
            label: 'Submitted Total',
            data: compliance.monthlyTrend.map((m) => m.submitted),
            backgroundColor: '#0284C7',
            borderRadius: 4,
          },
        ],
      };
    }
    const summary = compliance.barangayPerennialSummary.find((s) => s.barangay === selectedBarangay);
    const categories = ACCOMPLISHMENT_CATEGORIES.map((cat) => {
      const match = summary?.categoryData.find((c) => c.id === cat.id);
      return { label: cat.label, count: match ? match.count : 0 };
    });
    return {
      labels: ['Resolutions', ...categories.map((c) => c.label)],
      datasets: [
        {
          type: 'bar' as const,
          label: 'Submissions Count',
          data: [summary?.resolutions ?? 0, ...categories.map((c) => c.count)],
          backgroundColor: '#7C3AED',
          borderRadius: 4,
        },
      ],
    };
  }, [isAll, compliance, selectedBarangay]);

  const offscreenDoughnutOptions: ChartOptions<'doughnut'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
    },
  };

  const offscreenBarOptions: ChartOptions<'bar'> = {
    animation: false,
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
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
              ? 'Municipal Compliance Rate Distribution'
              : `Compliance Status Distribution — ${selectedBarangay}`,
            subtitle: 'Relative proportion of approved, pending, and overdue document filings',
            dataUrl: chart1Ref.current.toBase64Image(),
            heightPt: 160,
          });
        }
        if (chart2Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Barangay Comparative Compliance Performance'
              : `Document Filing Status Breakdown — ${selectedBarangay}`,
            dataUrl: chart2Ref.current.toBase64Image(),
            heightPt: 170,
          });
        }
        if (chart3Ref.current?.toBase64Image) {
          figures.push({
            title: isAll
              ? 'Annual Submission Activity Timeline'
              : `Perennial Submissions & Accomplishment Breakdown — ${selectedBarangay}`,
            dataUrl: chart3Ref.current.toBase64Image(),
            heightPt: 170,
          });
        }
      }

      await generateFormalPdfReport({
        year: selectedYear,
        scope: selectedBarangay,
        adminName: preparedBy || adminName,
        approvedBy,
        approvedByTitle: approverTitle,
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
          {/* 1. Scope & Filter Controls */}
          <ScopeFilterCard
            selectedBarangay={selectedBarangay}
            setSelectedBarangay={setSelectedBarangay}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            currentYear={currentYear}
          />

          {/* 2. Interactive Modular Section Toggles */}
          <SectionSelectionGrid sections={sections} onToggle={toggleSection} />

          {/* 3. Official Signatory Details */}
          <SignatoryCard
            preparedBy={preparedBy}
            setPreparedBy={setPreparedBy}
            approvedBy={approvedBy}
            setApprovedBy={setApprovedBy}
            approverTitle={approverTitle}
            setApproverTitle={setApproverTitle}
          />

          {/* 4. Records preview & Security status */}
          <SummaryRibbon
            isAll={isAll}
            selectedBarangay={selectedBarangay}
            matchCount={filteredSubmissions.length}
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
        <div style={{ width: '800px', height: '400px' }}>
          <Doughnut
            ref={chart1Ref as unknown as React.RefObject<ChartJS<'doughnut'>>}
            data={chart1Data}
            options={offscreenDoughnutOptions}
            width={800}
            height={400}
          />
        </div>
        <div style={{ width: '800px', height: '400px' }}>
          <Bar
            ref={chart2Ref as unknown as React.RefObject<ChartJS<'bar'>>}
            data={chart2Data}
            options={offscreenBarOptions}
            width={800}
            height={400}
          />
        </div>
        <div style={{ width: '800px', height: '400px' }}>
          <Bar
            ref={chart3Ref as unknown as React.RefObject<ChartJS<'bar'>>}
            data={chart3Data}
            options={offscreenBarOptions}
            width={800}
            height={400}
          />
        </div>
      </div>
    </>
  );
}
